// Variables globales
let inscriptions = [];
let animateurs = [];
let fraisFonctionnement = [];
let profilsAnimateurs = [];

// Constantes
const COUT_ANIMATEUR = 400;
const COUT_AIDE = 200;
const SEMAINES_4_JOURS = ['Été S3 2025'];

// Fonctions globales
window.changerStatutPaiement = function(index) {
    const statutsDisponibles = ['Non payé', 'Payé', 'Offert', 'Liquide'];
    const inscription = inscriptions[index];
    const statutActuel = inscription.paiement;
    const indexStatut = statutsDisponibles.indexOf(statutActuel);
    const nouveauStatut = statutsDisponibles[(indexStatut + 1) % statutsDisponibles.length];
    
    inscription.paiement = nouveauStatut;
    localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
    
    afficherInscriptions();
    mettreAJourTableauDeBord();
};

window.desinscrireEnfant = function(index) {
    if (confirm('Êtes-vous sûr de vouloir désinscrire cet enfant ?')) {
        inscriptions.splice(index, 1);
        localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
        afficherInscriptions();
        mettreAJourTableauDeBord();
    }
};

window.telechargerFicheInformation = function(index) {
    const inscription = inscriptions[index];
    const wb = XLSX.utils.book_new();
    
    const data = [
        ['Fiche d\'information'],
        [''],
        ['Informations de l\'enfant'],
        ['Nom et prénom', inscription.nom],
        ['Date de naissance', inscription.dateNaissance],
        ['Âge', inscription.age],
        ['Genre', inscription.sexe],
        [''],
        ['Stage'],
        ['Type de stage', inscription.stage],
        ['Semaine', inscription.semaine],
        ['Montant', `${inscription.montant}€`],
        ['Statut paiement', inscription.paiement],
        [''],
        ['Parent 1'],
        ['Nom et prénom', inscription.parents1.nom],
        ['Téléphone', inscription.parents1.telephone],
        ['Email', inscription.parents1.email],
        [''],
        ['Parent 2'],
        ['Nom et prénom', inscription.parents2.nom || 'Non renseigné'],
        ['Téléphone', inscription.parents2.telephone || 'Non renseigné'],
        ['Email', inscription.parents2.email || 'Non renseigné'],
        [''],
        ['Informations médicales'],
        ['Allergies et remarques', inscription.allergies || 'Aucune information']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }];
    
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
        { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },
        { s: { r: 14, c: 0 }, e: { r: 14, c: 1 } },
        { s: { r: 19, c: 0 }, e: { r: 19, c: 1 } },
        { s: { r: 24, c: 0 }, e: { r: 24, c: 1 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Fiche information");
    const nomFichier = `Fiche_${inscription.nom.replace(/\s+/g, '_')}_${inscription.stage.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, nomFichier);
};

// Définir d'abord toutes les fonctions utilitaires
function getProchainsStages(animateurs) {
    const today = new Date();
    const prochainsStages = [];
    const stagesTraites = new Set();

    animateurs.forEach(animateur => {
        const key = `${animateur.stage}-${animateur.semaine}`;
        if (!stagesTraites.has(key)) {
            const animateursStage = animateurs.filter(a => 
                a.stage === animateur.stage && 
                a.semaine === animateur.semaine
            ).map(a => a.nom);

            // Compter le nombre d'inscrits pour ce stage
            const nombreInscrits = inscriptions.filter(i => 
                i.stage === animateur.stage && 
                i.semaine === animateur.semaine
            ).length;

            prochainsStages.push({
                semaine: animateur.semaine,
                stage: animateur.stage,
                animateurs: animateursStage,
                inscrits: nombreInscrits
            });
            stagesTraites.add(key);
        }
    });

    return prochainsStages.slice(0, 5); // Retourner les 5 prochains stages
}

function calculerTotalParStage() {
    const totaux = {};
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    const fraisFonctionnement = JSON.parse(localStorage.getItem('fraisFonctionnement')) || [];

    inscriptions.forEach(inscription => {
        const key = `${inscription.stage}-${inscription.semaine}`;
        if (!totaux[key]) {
            totaux[key] = {
                total: 0,
                paye: 0,
                nonPaye: 0,
                offert: 0,
                liquide: 0,
                coutsSalariaux: 0,
                fraisFonctionnement: 0
            };
            
            // Calculer les coûts salariaux pour ce stage/semaine
            const animateursStage = animateurs.filter(a => 
                a.stage === inscription.stage && 
                a.semaine === inscription.semaine
            );
            
            totaux[key].coutsSalariaux = animateursStage.reduce((sum, a) => {
                const coutBase = a.role === 'Animateur' ? COUT_ANIMATEUR : COUT_AIDE;
                const coutFinal = SEMAINES_4_JOURS.includes(a.semaine) ? coutBase * 0.8 : coutBase;
                return sum + coutFinal;
            }, 0);
        }
        
        const montant = parseFloat(inscription.montant);
        
        // Ne pas compter les stages offerts dans le total
        if (inscription.paiement !== 'Offert' && inscription.paiement !== 'Liquide') {
            totaux[key].total += montant;
        }
        
        switch(inscription.paiement) {
            case 'Payé':
                totaux[key].paye += montant;
                break;
            case 'Non payé':
                totaux[key].nonPaye += montant;
                break;
            case 'Offert':
                totaux[key].offert += montant;
                break;
            case 'Liquide':
                totaux[key].liquide += montant;
                break;
        }
    });

    // Ajouter les frais de fonctionnement
    fraisFonctionnement.forEach(frais => {
        const key = `${frais.stage}-${frais.semaine}`;
        if (!totaux[key]) {
            totaux[key] = {
                total: 0,
                paye: 0,
                nonPaye: 0,
                coutsSalariaux: 0,
                fraisFonctionnement: 0
            };
        }
        totaux[key].fraisFonctionnement += parseFloat(frais.montant);
    });

    return totaux;
}

function mettreAJourTableauDeBord() {
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    const totaux = calculerTotalParStage();

    // Statistiques des inscriptions groupées par semaine
    const statsInscriptions = document.getElementById('inscriptions-stats');
    const inscriptionsParSemaine = {};
    
    // Définir l'ordre des semaines
    const ordreDesSemaines = [
        'Pâques S1 2025',
        'Pâques S2 2025',
        'Été S1 2025',
        'Été S2 2025',
        'Été S3 2025',
        'Été S4 2025',
        'Toussaint 2025'
    ];

    // Initialiser les compteurs par semaine
    ordreDesSemaines.forEach(semaine => {
        inscriptionsParSemaine[semaine] = {
            total: 0,
            stages: {}
        };
    });

    // Compter les inscriptions par semaine et par stage
    inscriptions.forEach(inscription => {
        inscriptionsParSemaine[inscription.semaine].total++;
        if (!inscriptionsParSemaine[inscription.semaine].stages[inscription.stage]) {
            inscriptionsParSemaine[inscription.semaine].stages[inscription.stage] = [];
        }
        inscriptionsParSemaine[inscription.semaine].stages[inscription.stage].push(inscription);
    });

    // Générer l'HTML pour les statistiques d'inscriptions
    let inscriptionsHtml = `
        <div class="stat-number">${inscriptions.length}</div>
        <div class="stat-label">Inscriptions totales</div>
        <div class="inscriptions-by-week mt-4">
    `;

    ordreDesSemaines.forEach(semaine => {
        if (inscriptionsParSemaine[semaine].total > 0) {
            inscriptionsHtml += `
                <div class="week-section">
                    <h6 class="week-title">${semaine} (${inscriptionsParSemaine[semaine].total} inscrits)</h6>
                    <div class="stages-list">
            `;

            Object.entries(inscriptionsParSemaine[semaine].stages).forEach(([stage, inscrits]) => {
                inscriptionsHtml += `
                    <div class="stage-item">
                        <strong>${stage}</strong> (${inscrits.length})
                        <div class="inscriptions-list">
                            ${inscrits.map(i => i.nom).join(', ')}
                        </div>
                    </div>
                `;
            });

            inscriptionsHtml += `
                    </div>
                </div>
            `;
        }
    });

    inscriptionsHtml += '</div>';
    statsInscriptions.innerHTML = inscriptionsHtml;

    // Statistiques financières
    const statsFinances = document.getElementById('finances-stats');
    let totalPercu = 0;
    let totalARecevoir = 0;
    let totalLiquide = 0;

    Object.values(totaux).forEach(value => {
        totalPercu += value.paye;
        totalARecevoir += value.nonPaye;
        totalLiquide += value.liquide;
    });

    statsFinances.innerHTML = `
        <div class="stat-number">${totalPercu.toFixed(2)}€</div>
        <div class="stat-label">Montant perçu</div>
        <div class="stat-number text-warning">${totalARecevoir.toFixed(2)}€</div>
        <div class="stat-label">Montant à recevoir</div>
        <div class="stat-number text-info">${totalLiquide.toFixed(2)}€</div>
        <div class="stat-label">Montant en liquide</div>
    `;

    // Ajouter la section des paiements en attente
    const paiementsEnAttente = inscriptions.filter(i => i.paiement === 'Non payé');
    
    if (paiementsEnAttente.length > 0) {
        statsFinances.innerHTML += `
            <div class="mt-4">
                <h6 class="card-subtitle mb-2">Paiements en attente</h6>
                <div class="payments-pending">
                    ${paiementsEnAttente.map(inscription => `
                        <div class="payment-item">
                            <strong>${inscription.nom}</strong> - ${inscription.montant}€<br>
                            Stage: ${inscription.stage} (${inscription.semaine})<br>
                            Parent: ${inscription.parents1 ? inscription.parents1.nom : 'Non renseigné'}<br>
                            Tél: ${inscription.parents1 ? inscription.parents1.telephone : 'Non renseigné'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Prochains stages avec animateurs
    const statsAnimateurs = document.getElementById('animateurs-stats');
    const prochainsStages = getProchainsStages(animateurs);
    statsAnimateurs.innerHTML = prochainsStages.map(stage => `
        <div class="upcoming-event">
            <strong>${stage.semaine}</strong><br>
            ${stage.stage} <span class="badge bg-info">${stage.inscrits} inscrits</span><br>
            Animateurs : ${stage.animateurs.join(', ')}
        </div>
    `).join('');
}

// Ensuite le DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Charger les données du localStorage
    inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    fraisFonctionnement = JSON.parse(localStorage.getItem('fraisFonctionnement')) || [];
    profilsAnimateurs = JSON.parse(localStorage.getItem('profilsAnimateurs')) || [];

    // Mettre à jour le format des anciennes inscriptions
    inscriptions = inscriptions.map(inscription => {
        if (!inscription.parents1) {
            return {
                ...inscription,
                parents1: {
                    nom: inscription.parents || 'Non renseigné',
                    telephone: inscription.telephone || 'Non renseigné',
                    email: 'Non renseigné'
                },
                parents2: {
                    nom: 'Non renseigné',
                    telephone: 'Non renseigné',
                    email: 'Non renseigné'
                }
            };
        }
        return inscription;
    });
    localStorage.setItem('inscriptions', JSON.stringify(inscriptions));

    // Initialiser l'affichage
    afficherInscriptions();
    afficherAnimateurs();
    afficherFrais();
    mettreAJourTableauDeBord();

    // Ajouter les écouteurs d'événements pour les onglets
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            if (targetId === 'accueil') {
                mettreAJourTableauDeBord();
            }
        });
    });

    // Ajouter l'écouteur d'événements pour la recherche globale
    document.getElementById('searchGlobal').addEventListener('input', function(e) {
        rechercherGlobal(e.target.value);
    });

    const form = document.getElementById('inscriptionForm');
    const table = document.getElementById('inscriptionsTable').getElementsByTagName('tbody')[0];

    function afficherResume(stageFiltre = null) {
        const totaux = calculerTotalParStage();
        const summaryDiv = document.getElementById('financialSummary');
        let html = '';
        
        for (const [key, value] of Object.entries(totaux)) {
            const [stage, semaine] = key.split('-');
            
            // Filtrer selon le type de stage
            if (stageFiltre) {
                if (stageFiltre === 'vtt' && !stage.includes('VTT')) continue;
                if (stageFiltre === 'artistique-culinaire' && stage !== 'Artistique/Culinaire') continue;
                if (stageFiltre !== 'vtt' && stageFiltre !== 'artistique-culinaire' && 
                    !stage.toLowerCase().startsWith(stageFiltre.toLowerCase())) continue;
            }

            const beneficeNet = value.total - value.coutsSalariaux - value.fraisFonctionnement;
            html += `
                <div class="mb-4">
                    <h5>${stage} - ${semaine}</h5>
                    <div class="summary-section">
                        <p>Total revenus: ${value.total.toFixed(2)}€</p>
                        <p>Payé: ${value.paye.toFixed(2)}€</p>
                        <p>Non payé: ${value.nonPaye.toFixed(2)}€</p>
                        <p>Coûts salariaux: -${value.coutsSalariaux.toFixed(2)}€</p>
                        <p>Frais de fonctionnement: -${value.fraisFonctionnement.toFixed(2)}€</p>
                        <p class="fw-bold">Bénéfice net: ${beneficeNet.toFixed(2)}€</p>
                    </div>
                </div>
            `;
        }
        
        if (html === '') {
            html = '<p class="no-data-message">Aucune donnée financière disponible pour ce type de stage.</p>';
        }
        
        summaryDiv.innerHTML = html;
        creerGraphiques(totaux, stageFiltre);
    }

    function calculerResumeInscriptions() {
        const resume = {};
        const stages = [
            'VTT Initiation',
            'VTT Perfectionnement',
            'Danse',
            'Créativité/Culinaire',
            'Multisports'
        ];
        const semaines = {
            'Pâques S1 2025': 'du 28 avril au 2 mai 2025',
            'Pâques S2 2025': 'du 5 au 9 mai 2025',
            'Été S1 2025': 'du 7 au 11 juillet 2025',
            'Été S2 2025': 'du 14 au 18 juillet 2025',
            'Été S3 2025': 'du 22 au 25 juillet 2025',
            'Été S4 2025': 'du 18 au 22 août 2025',
            'Toussaint 2025': 'du 20 au 25 octobre 2025'
        };

        stages.forEach(stage => {
            resume[stage] = {};
            Object.keys(semaines).forEach(semaine => {
                resume[stage][semaine] = {
                    count: 0,
                    participants: []
                };
            });
        });

        inscriptions.forEach(inscription => {
            if (resume[inscription.stage] && resume[inscription.stage][inscription.semaine]) {
                resume[inscription.stage][inscription.semaine].count++;
                resume[inscription.stage][inscription.semaine].participants.push(inscription.nom);
            }
        });

        return { resume, semaines };
    }

    function afficherResumeInscriptions(stageFiltre = null) {
        const inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
        const resume = {};
        const stages = [
            'VTT Initiation',
            'VTT Perfectionnement',
            'Danse',
            'Créativité/Culinaire',
            'Multisports'
        ];
        const semaines = {
            'Pâques S1 2025': 'du 28 avril au 2 mai 2025',
            'Pâques S2 2025': 'du 5 au 9 mai 2025',
            'Été S1 2025': 'du 7 au 11 juillet 2025',
            'Été S2 2025': 'du 14 au 18 juillet 2025',
            'Été S3 2025': 'du 22 au 25 juillet 2025',
            'Été S4 2025': 'du 18 au 22 août 2025',
            'Toussaint 2025': 'du 20 au 25 octobre 2025'
        };

        // Initialiser le résumé
        stages.forEach(stage => {
            resume[stage] = {};
            Object.keys(semaines).forEach(semaine => {
                resume[stage][semaine] = {
                    count: 0,
                    participants: []
                };
            });
        });

        // Compter les inscriptions
        inscriptions.forEach(inscription => {
            if (resume[inscription.stage] && resume[inscription.stage][inscription.semaine]) {
                resume[inscription.stage][inscription.semaine].count++;
                resume[inscription.stage][inscription.semaine].participants.push(inscription.nom);
            }
        });

        const summaryDiv = document.getElementById('inscriptionSummary');
        let html = '';
        const CAPACITE_MAX = 20;

        if (stageFiltre === 'tous') {
            // Afficher une seule jauge par semaine
            const totauxParSemaine = {};
            Object.keys(semaines).forEach(semaine => {
                totauxParSemaine[semaine] = {
                    count: 0,
                    participants: []
                };
                // Additionner les inscriptions de tous les stages pour cette semaine
                Object.values(resume).forEach(stageDonnees => {
                    if (stageDonnees[semaine]) {
                        totauxParSemaine[semaine].count += stageDonnees[semaine].count;
                        totauxParSemaine[semaine].participants = totauxParSemaine[semaine].participants.concat(stageDonnees[semaine].participants);
                    }
                });
            });

            // Afficher une seule jauge par semaine
            html = '<div class="summary-section">';
            Object.entries(totauxParSemaine).forEach(([semaine, donnees]) => {
                const semaineDetails = semaines[semaine];
                const progressPercentage = Math.min((donnees.count / CAPACITE_MAX) * 100, 100);

                let progressColor;
                if (donnees.count >= CAPACITE_MAX) {
                    progressColor = 'bg-danger';
                } else if (donnees.count >= CAPACITE_MAX * 0.8) {
                    progressColor = 'bg-warning';
                } else {
                    progressColor = 'bg-success';
                }

                html += `
                    <div class="mb-4">
                        <h5>${semaine} (${semaineDetails})</h5>
                        <div class="progress" style="height: 35px; margin: 10px 0;">
                            <div class="progress-bar ${progressColor} d-flex align-items-center justify-content-center fw-bold" 
                                 role="progressbar" 
                                 style="width: ${progressPercentage}%; font-size: 18px;" 
                                 aria-valuenow="${donnees.count}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="${CAPACITE_MAX}">
                                ${donnees.count}/${CAPACITE_MAX}
                            </div>
                        </div>
                    </div>`;
            });
            html += '</div>';
        } else {
            // Affichage par type de stage
            html += '<div class="summary-section">';
            for (const [stage, semaineDonnees] of Object.entries(resume)) {
                if (stageFiltre === 'vtt' && !stage.includes('VTT')) continue;
                if (stageFiltre === 'creativite-culinaire' && stage !== 'Créativité/Culinaire') continue;
                if (stageFiltre === 'danse' && stage !== 'Danse') continue;
                if (stageFiltre === 'multisports' && stage !== 'Multisports') continue;

                html += `<h4>${stage}</h4>`;
                
                for (const [semaine, donnees] of Object.entries(semaineDonnees)) {
                    const semaineDetails = semaines[semaine];
                    const placesRestantes = CAPACITE_MAX - donnees.count;
                    const progressPercentage = (donnees.count / CAPACITE_MAX) * 100;

                    let progressColor;
                    if (donnees.count >= CAPACITE_MAX) {
                        progressColor = 'bg-danger';
                    } else if (donnees.count >= CAPACITE_MAX * 0.8) {
                        progressColor = 'bg-warning';
                    } else {
                        progressColor = 'bg-success';
                    }

                    html += `
                        <div class="mb-4">
                            <h5>
                                ${semaine} (${semaineDetails})
                                <span class="badge bg-${progressColor} ms-2">
                                    ${donnees.count}/${CAPACITE_MAX}
                                </span>
                            </h5>
                            <div class="d-flex justify-content-between align-items-center">
                                <span>Inscrits: ${donnees.count}/${CAPACITE_MAX}</span>
                                <span>${placesRestantes > 0 ? `Places restantes: ${placesRestantes}` : 'COMPLET'}</span>
                            </div>
                            <div class="progress" style="height: 20px; margin: 10px 0;">
                                <div class="progress-bar ${progressColor}" 
                                     role="progressbar" 
                                     style="width: ${progressPercentage}%" 
                                     aria-valuenow="${donnees.count}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="${CAPACITE_MAX}">
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <div>
                                    ${donnees.count > 0 ? `
                                        <strong>Participants:</strong><br>
                                        ${donnees.participants.join(', ')}
                                    ` : 'Aucun inscrit'}
                                </div>
                                <button class="btn btn-success btn-sm" onclick="exporterListePresence('${stage}', '${semaine}')">
                                    Liste de présence
                                </button>
                            </div>
                        </div>`;
                }
            }
            html += '</div>';
        }

        summaryDiv.innerHTML = html || '<p>Aucune donnée disponible.</p>';
    }

    function afficherInscriptions(stageFiltre = null) {
        const table = document.getElementById('inscriptionsTable').getElementsByTagName('tbody')[0];
        
        // Définir l'ordre des semaines
        const ordreDesSemaines = [
            'Pâques S1 2025',
            'Pâques S2 2025',
            'Été S1 2025',
            'Été S2 2025',
            'Été S3 2025',
            'Été S4 2025',
            'Toussaint 2025'
        ];

        // Définir l'ordre des stages
        const ordreDesStages = [
            'VTT Initiation',
            'VTT Perfectionnement',
            'Danse',
            'Créativité/Culinaire',
            'Multisports'
        ];

        // Filtrer les inscriptions selon le stage sélectionné
        const inscriptionsFiltrees = stageFiltre ? 
            inscriptions.filter(i => {
                if (stageFiltre === 'vtt') {
                    return i.stage === 'VTT Initiation' || i.stage === 'VTT Perfectionnement';
                }
                if (stageFiltre === 'creativite-culinaire') {
                    return i.stage === 'Créativité/Culinaire';
                }
                if (stageFiltre === 'danse') {
                    return i.stage === 'Danse';
                }
                if (stageFiltre === 'multisports') {
                    return i.stage === 'Multisports';
                }
                return true;
            }) : 
            inscriptions;

        // Trier les inscriptions par semaine puis par stage
        const inscriptionsTriees = inscriptionsFiltrees.sort((a, b) => {
            const semaineA = ordreDesSemaines.indexOf(a.semaine);
            const semaineB = ordreDesSemaines.indexOf(b.semaine);
            if (semaineA !== semaineB) return semaineA - semaineB;
            
            const stageA = ordreDesStages.indexOf(a.stage);
            const stageB = ordreDesStages.indexOf(b.stage);
            return stageA - stageB;
        });

        // Vider la table
        table.innerHTML = '';

        // Afficher les inscriptions triées
        let semaineActuelle = '';
        inscriptionsTriees.forEach((inscription, index) => {
            // Ajouter un séparateur de semaine si nécessaire
            if (inscription.semaine !== semaineActuelle) {
                semaineActuelle = inscription.semaine;
                const rowSemaine = table.insertRow();
                rowSemaine.innerHTML = `
                    <td colspan="6" class="table-secondary">
                        <strong>${semaineActuelle}</strong>
                    </td>
                `;
            }

            const row = table.insertRow();
            row.innerHTML = `
                <td>${inscription.nom}</td>
                <td>${inscription.stage}</td>
                <td>${inscription.semaine}</td>
                <td>${inscription.montant}€</td>
                <td>
                    <button class="btn btn-sm ${getBadgeClass(inscription.paiement)}" 
                            onclick="changerStatutPaiement(${index})"
                            title="Changer le statut de paiement">
                        ${inscription.paiement}
                    </button>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="telechargerFicheInformation(${index})"
                                title="Télécharger la fiche d'information">
                            <i class="bi bi-file-earmark-text"></i>
                        </button>
                        <button class="btn btn-warning" onclick="modifierInscription(${index})"
                                title="Modifier l'inscription">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-primary" onclick="dupliquerInscription(${index})"
                                title="Dupliquer l'inscription">
                            <i class="bi bi-files"></i>
                        </button>
                        <button class="btn btn-danger" onclick="desinscrireEnfant(${index})"
                                title="Désinscrire l'enfant">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
        });
        
        afficherResume(stageFiltre);
        afficherResumeInscriptions(stageFiltre);
    }

    function afficherAnimateurs() {
        const table = document.getElementById('animateursTable').getElementsByTagName('tbody')[0];
        const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
        
        // Définir l'ordre des semaines
        const ordreDesSemaines = [
            'Pâques S1 2025',
            'Pâques S2 2025',
            'Été S1 2025',
            'Été S2 2025',
            'Été S3 2025',
            'Été S4 2025',
            'Toussaint 2025'
        ];

        // Définir l'ordre des stages
        const ordreDesStages = [
            'VTT Initiation',
            'VTT Perfectionnement',
            'Danse',
            'Créativité/Culinaire',
            'Multisports'
        ];

        // Trier les animateurs par semaine puis par stage
        const animateursTriees = animateurs.sort((a, b) => {
            const semaineA = ordreDesSemaines.indexOf(a.semaine);
            const semaineB = ordreDesSemaines.indexOf(b.semaine);
            if (semaineA !== semaineB) return semaineA - semaineB;
            
            const stageA = ordreDesStages.indexOf(a.stage);
            const stageB = ordreDesStages.indexOf(b.stage);
            return stageA - stageB;
        });

        // Vider la table
        table.innerHTML = '';

        // Afficher les animateurs triés
        let semaineActuelle = '';
        animateursTriees.forEach((animateur, index) => {
            // Ajouter un séparateur de semaine si nécessaire
            if (animateur.semaine !== semaineActuelle) {
                semaineActuelle = animateur.semaine;
                const rowSemaine = table.insertRow();
                rowSemaine.innerHTML = `
                    <td colspan="6" class="table-secondary">
                        <strong>${semaineActuelle}</strong>
                    </td>
                `;
            }

            const row = table.insertRow();
            row.innerHTML = `
                <td>${animateur.nom}</td>
                <td>${animateur.telephone}</td>
                <td>${animateur.role}</td>
                <td>${animateur.stage}</td>
                <td>${animateur.semaine}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="supprimerAnimateur(${index})">
                        Supprimer
                    </button>
                </td>
            `;
        });
    }

    window.supprimerAnimateur = function(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet animateur ?')) {
            animateurs.splice(index, 1);
            localStorage.setItem('animateurs', JSON.stringify(animateurs));
            afficherAnimateurs();
        }
    };

    document.getElementById('animateurForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const indexAnimateur = document.getElementById('selectAnimateur').value;
        if (indexAnimateur === '') {
            alert('Veuillez sélectionner un animateur');
            return;
        }

        const profilSelectionne = profilsAnimateurs[indexAnimateur];
        const nouvelAnimateur = {
            nom: `${profilSelectionne.nom} ${profilSelectionne.prenom}`,
            telephone: profilSelectionne.telephone,
            role: document.getElementById('roleAnimateur').value,
            stage: document.getElementById('stageAnimateur').value,
            semaine: document.getElementById('semaineAnimateur').value
        };

        animateurs.push(nouvelAnimateur);
        localStorage.setItem('animateurs', JSON.stringify(animateurs));
        
        afficherAnimateurs();
        this.reset();
    });

    // Modifier la gestion des événements des onglets
    document.querySelectorAll('#stageTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const stageFiltre = e.target.id.replace('-tab', '');
            afficherInscriptions(stageFiltre === 'tous' ? null : stageFiltre);
        });
    });

    // Modification de la gestion du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const stage = document.getElementById('stage').value;
        const semaine = document.getElementById('semaine').value;
        const CAPACITE_MAX = 20;

        // Vérifier le nombre d'inscrits pour ce stage/semaine
        const nombreInscrits = inscriptions.filter(i => 
            i.stage === stage && i.semaine === semaine
        ).length;

        if (nombreInscrits >= CAPACITE_MAX) {
            alert(`Désolé, le stage "${stage}" pour la semaine "${semaine}" est complet.`);
            return;
        }
        
        const inscription = {
            nom: document.getElementById('nom').value,
            dateNaissance: document.getElementById('dateNaissance').value,
            sexe: document.getElementById('sexe').value,
            age: document.getElementById('age').value,
            stage: stage,
            semaine: semaine,
            parents1: {
                nom: document.getElementById('parents1').value,
                telephone: document.getElementById('telephone1').value,
                email: document.getElementById('email1').value
            },
            parents2: {
                nom: document.getElementById('parents2').value,
                telephone: document.getElementById('telephone2').value,
                email: document.getElementById('email2').value
            },
            allergies: document.getElementById('allergies').value,
            montant: document.getElementById('montant').value,
            paiement: document.getElementById('paiement').value
        };

        inscriptions.push(inscription);
        localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
        
        afficherInscriptions();
        form.reset();
    });

    // Fonction pour supprimer une inscription
    window.supprimerInscription = function(index) {
        inscriptions.splice(index, 1);
        localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
        afficherInscriptions();
    };

    // Ajouter dans le DOMContentLoaded
    afficherInscriptions();
    afficherAnimateurs();

    // Ajouter dans le DOMContentLoaded, après les autres gestionnaires d'événements d'onglets
    document.querySelectorAll('#financeStagesTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const stageFiltre = e.target.id.replace('finance-', '').replace('-tab', '');
            afficherResume(stageFiltre === 'tous' ? null : stageFiltre);
        });
    });

    // Ajouter cette fonction pour créer les graphiques
    function creerGraphiques(totaux, stageFiltre = null) {
        const chartContainer = document.getElementById('chartContainer');
        chartContainer.innerHTML = '';

        for (const [key, value] of Object.entries(totaux)) {
            const [stage, semaine] = key.split('-');
            
            // Filtrer selon le type de stage
            if (stageFiltre) {
                if (stageFiltre === 'vtt' && !stage.includes('VTT')) continue;
                if (stageFiltre === 'artistique-culinaire' && stage !== 'Artistique/Culinaire') continue;
                if (stageFiltre !== 'vtt' && stageFiltre !== 'artistique-culinaire' && 
                    !stage.toLowerCase().startsWith(stageFiltre.toLowerCase())) continue;
            }

            const chartDiv = document.createElement('div');
            chartDiv.className = 'stage-box mb-4';
            const canvas = document.createElement('canvas');
            chartDiv.appendChild(canvas);
            chartContainer.appendChild(chartDiv);

            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: ['Payé', 'Non payé', 'Liquide', 'Coûts salariaux', 'Frais de fonctionnement'],
                    datasets: [{
                        data: [
                            value.paye,
                            value.nonPaye,
                            value.liquide,
                            value.coutsSalariaux,
                            value.fraisFonctionnement
                        ],
                        backgroundColor: [
                            '#28a745', // Vert pour payé
                            '#ffc107', // Jaune pour non payé
                            '#17a2b8', // Bleu pour liquide
                            '#dc3545', // Rouge pour coûts salariaux
                            '#6c757d'  // Gris pour frais de fonctionnement
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${stage} - ${semaine}`,
                            font: { size: 16 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    // Ajouter dans le DOMContentLoaded, après les autres gestionnaires d'événements d'onglets
    document.querySelectorAll('#presenceStagesTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const stageFiltre = e.target.id.replace('presence-', '').replace('-tab', '');
            afficherResumeInscriptions(stageFiltre === 'tous' ? null : stageFiltre);
        });
    });

    // Ajouter une fonction pour gérer les couleurs des badges
    function getBadgeClass(statut) {
        switch(statut) {
            case 'Payé':
                return 'btn-success';
            case 'Liquide':
                return 'btn-info';
            case 'Non payé':
                return 'btn-warning';
            default:
                return 'btn-secondary';
        }
    }

    document.getElementById('fraisForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nouveauFrais = {
            stage: document.getElementById('stagefrais').value,
            semaine: document.getElementById('semainefrais').value,
            description: document.getElementById('descriptionfrais').value,
            montant: parseFloat(document.getElementById('montantfrais').value)
        };

        fraisFonctionnement.push(nouveauFrais);
        localStorage.setItem('fraisFonctionnement', JSON.stringify(fraisFonctionnement));
        
        afficherFrais();
        this.reset();
    });

    function afficherFrais() {
        const tableFrais = document.getElementById('fraisTable').getElementsByTagName('tbody')[0];
        tableFrais.innerHTML = '';
        
        fraisFonctionnement.forEach((frais, index) => {
            const row = tableFrais.insertRow();
            row.innerHTML = `
                <td>${frais.stage}</td>
                <td>${frais.semaine}</td>
                <td>${frais.description}</td>
                <td>${frais.montant.toFixed(2)}€</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="supprimerFrais(${index})">
                        Supprimer
                    </button>
                </td>
            `;
        });
    }

    window.supprimerFrais = function(index) {
        fraisFonctionnement.splice(index, 1);
        localStorage.setItem('fraisFonctionnement', JSON.stringify(fraisFonctionnement));
        afficherFrais();
    };

    afficherFrais();

    // Ajouter cette fonction pour mettre à jour le menu déroulant des animateurs
    function mettreAJourSelectAnimateur() {
        const select = document.getElementById('selectAnimateur');
        select.innerHTML = '<option value="">Choisir un animateur...</option>';
        
        profilsAnimateurs.forEach((profil, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${profil.nom} ${profil.prenom}`;
            select.appendChild(option);
        });
    }

    // Gérer le formulaire de profil animateur
    document.getElementById('profilAnimateurForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nouveauProfil = {
            nom: document.getElementById('nomProfilAnimateur').value,
            prenom: document.getElementById('prenomProfilAnimateur').value,
            adresse: document.getElementById('adresseProfilAnimateur').value,
            telephone: document.getElementById('telephoneProfilAnimateur').value,
            compte: document.getElementById('compteProfilAnimateur').value
        };

        profilsAnimateurs.push(nouveauProfil);
        localStorage.setItem('profilsAnimateurs', JSON.stringify(profilsAnimateurs));
        
        afficherProfilsAnimateurs();
        mettreAJourSelectAnimateur();
        this.reset();
    });

    // Gérer la sélection d'un animateur existant
    document.getElementById('selectAnimateur').addEventListener('change', function(e) {
        const index = this.value;
        if (index !== '') {
            const profil = profilsAnimateurs[index];
            // Les informations du profil seront utilisées lors de la soumission du formulaire
        }
    });

    function afficherProfilsAnimateurs() {
        const table = document.getElementById('profilsAnimateursTable').getElementsByTagName('tbody')[0];
        table.innerHTML = '';
        
        profilsAnimateurs.forEach((profil, index) => {
            const row = table.insertRow();
            row.innerHTML = `
                <td>${profil.nom}</td>
                <td>${profil.prenom}</td>
                <td>${profil.adresse}</td>
                <td>${profil.telephone}</td>
                <td>${profil.compte}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="supprimerProfilAnimateur(${index})">
                        Supprimer
                    </button>
                </td>
            `;
        });
    }

    window.supprimerProfilAnimateur = function(index) {
        profilsAnimateurs.splice(index, 1);
        localStorage.setItem('profilsAnimateurs', JSON.stringify(profilsAnimateurs));
        afficherProfilsAnimateurs();
        mettreAJourSelectAnimateur();
    };

    // Initialiser l'affichage
    afficherProfilsAnimateurs();
    mettreAJourSelectAnimateur();

    // Ajouter la fonction pour désinscrire un enfant
    window.desinscrireEnfant = function(index) {
        if (confirm('Êtes-vous sûr de vouloir désinscrire cet enfant ?')) {
            inscriptions.splice(index, 1);
            localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
            afficherInscriptions();
            mettreAJourTableauDeBord();
        }
    }
});

// Ajouter ces deux fonctions après les autres fonctions window.*
window.modifierInscription = function(index) {
    const inscription = inscriptions[index];
    
    document.getElementById('nom').value = inscription.nom;
    document.getElementById('dateNaissance').value = inscription.dateNaissance;
    document.getElementById('sexe').value = inscription.sexe;
    document.getElementById('age').value = inscription.age;
    document.getElementById('stage').value = inscription.stage;
    document.getElementById('semaine').value = inscription.semaine;
    document.getElementById('parents1').value = inscription.parents1.nom;
    document.getElementById('telephone1').value = inscription.parents1.telephone;
    document.getElementById('email1').value = inscription.parents1.email;
    document.getElementById('parents2').value = inscription.parents2.nom || '';
    document.getElementById('telephone2').value = inscription.parents2.telephone || '';
    document.getElementById('email2').value = inscription.parents2.email || '';
    document.getElementById('allergies').value = inscription.allergies || '';
    document.getElementById('montant').value = inscription.montant;
    document.getElementById('paiement').value = inscription.paiement;

    document.getElementById('inscriptionForm').scrollIntoView({ behavior: 'smooth' });
    
    const submitBtn = document.getElementById('submitInscription');
    submitBtn.textContent = 'Modifier l\'inscription';
    submitBtn.dataset.mode = 'edit';
    submitBtn.dataset.editIndex = index;
    
    document.querySelector('a[href="#inscriptions"]').click();
};

window.dupliquerInscription = function(index) {
    const inscription = {...inscriptions[index]};
    
    const modalHtml = `
        <div class="modal fade" id="dupliquerModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Dupliquer l'inscription de ${inscription.nom}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Stage</label>
                            <select id="newStage" class="form-select">
                                <option value="">Choisir un stage...</option>
                                <option value="VTT Initiation">VTT Initiation</option>
                                <option value="VTT Perfectionnement">VTT Perfectionnement</option>
                                <option value="Danse">Danse</option>
                                <option value="Créativité/Culinaire">Créativité/Culinaire</option>
                                <option value="Multisports">Multisports</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Semaine</label>
                            <select id="newSemaine" class="form-select">
                                <option value="">Choisir une semaine...</option>
                                <option value="Pâques S1 2025">Pâques S1 2025</option>
                                <option value="Pâques S2 2025">Pâques S2 2025</option>
                                <option value="Été S1 2025">Été S1 2025</option>
                                <option value="Été S2 2025">Été S2 2025</option>
                                <option value="Été S3 2025">Été S3 2025</option>
                                <option value="Été S4 2025">Été S4 2025</option>
                                <option value="Toussaint 2025">Toussaint 2025</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" onclick="window.confirmerDuplication(${index})">
                            Dupliquer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('dupliquerModal'));
    modal.show();
    
    document.getElementById('dupliquerModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
};

window.confirmerDuplication = function(index) {
    const inscription = {...inscriptions[index]};
    const newStage = document.getElementById('newStage').value;
    const newSemaine = document.getElementById('newSemaine').value;
    
    if (!newStage || !newSemaine) {
        alert('Veuillez sélectionner un stage et une semaine');
        return;
    }
    
    const nouvelleInscription = {
        ...inscription,
        stage: newStage,
        semaine: newSemaine,
        paiement: 'Non payé'
    };
    
    inscriptions.push(nouvelleInscription);
    localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
    
    bootstrap.Modal.getInstance(document.getElementById('dupliquerModal')).hide();
    afficherInscriptions();
    mettreAJourTableauDeBord();
};

// Ajouter cette fonction en dehors du DOMContentLoaded
window.exporterListePresence = function(stage, semaine) {
    const wb = XLSX.utils.book_new();
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    
    const inscritsStage = inscriptions.filter(i => 
        i.stage === stage && i.semaine === semaine
    );

    if (inscritsStage.length > 0) {
        const listePresence = inscritsStage.map(i => ({
            'Nom/Prénom': i.nom,
            'Âge': i.age,
            'Parents': i.parents,
            'Téléphone': i.telephone,
            'Informations médicales': i.allergies,
            'Montant': i.montant + '€',
            'Statut paiement': i.paiement,
            'Lundi': '☐\n│\n☐',
            'Mardi': '☐\n│\n☐',
            'Mercredi': '☐\n│\n☐',
            'Jeudi': '☐\n│\n☐',
            'Vendredi': '☐\n│\n☐'
        }));

        const ws = XLSX.utils.json_to_sheet(listePresence);
        
        // Définir la largeur des colonnes
        const wscols = [
            {wch: 20},  // Nom/Prénom
            {wch: 5},   // Âge
            {wch: 25},  // Parents
            {wch: 15},  // Téléphone
            {wch: 30},  // Informations médicales
            {wch: 10},  // Montant
            {wch: 15},  // Statut paiement
            {wch: 8},   // Lundi
            {wch: 8},   // Mardi
            {wch: 8},   // Mercredi
            {wch: 8},   // Jeudi
            {wch: 8}    // Vendredi
        ];
        ws['!cols'] = wscols;

        // Ajuster la hauteur des lignes
        ws['!rows'] = Array(listePresence.length + 1).fill({ hpt: 25 });

        XLSX.utils.book_append_sheet(wb, ws, "Liste de présence");
        XLSX.writeFile(wb, `Liste_presence_${stage}_${semaine}.xlsx`);
    } else {
        alert('Aucun inscrit pour ce stage à cette période.');
    }
};

// Fonction utilitaire pour le téléchargement Excel
function downloadExcel(wb, filename) {
    try {
        // Générer le fichier
        const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
        
        // Créer le Blob
        const blob = new Blob([wbout], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        
        // Créer l'URL et le lien
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Déclencher le téléchargement
        document.body.appendChild(a);
        a.click();
        
        // Nettoyer
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        alert('Une erreur est survenue lors du téléchargement. Veuillez réessayer.');
    }
}

// Modifier la fonction exporterCoutsSalariaux
window.exporterCoutsSalariaux = function() {
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    if (animateurs.length === 0) {
        alert('Aucun animateur enregistré.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const data = [['Nom/Prénom', 'Rôle', 'Stage', 'Semaine', 'Coût']];

    animateurs.forEach(a => {
        const coutBase = a.role === 'Animateur' ? COUT_ANIMATEUR : COUT_AIDE;
        const coutFinal = SEMAINES_4_JOURS.includes(a.semaine) ? coutBase * 0.8 : coutBase;
        
        data.push([
            a.nom,
            a.role,
            a.stage,
            a.semaine,
            coutFinal.toFixed(2) + '€'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Coûts salariaux");
    XLSX.writeFile(wb, 'Couts_salariaux.xlsx');
};

window.exporterListeAnimateurs = function() {
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    if (animateurs.length === 0) {
        alert('Aucun animateur enregistré.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const data = [['Nom/Prénom', 'Téléphone', 'Rôle', 'Stage', 'Semaine']];

    animateurs.forEach(a => {
        data.push([a.nom, a.telephone, a.role, a.stage, a.semaine]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Liste des animateurs");
    XLSX.writeFile(wb, 'Liste_animateurs.xlsx');
};

window.exporterResumesFinanciers = function() {
    const totaux = calculerTotalParStage();
    const wb = XLSX.utils.book_new();
    const data = [['Stage', 'Semaine', 'Total revenus', 'Payé', 'Non payé', 'Offert', 'Coûts salariaux', 'Frais de fonctionnement', 'Bénéfice net']];

    Object.entries(totaux).forEach(([key, value]) => {
        const [stage, semaine] = key.split('-');
        const beneficeNet = value.total - value.coutsSalariaux - value.fraisFonctionnement;
        
        data.push([
            stage,
            semaine,
            value.total.toFixed(2) + '€',
            value.paye.toFixed(2) + '€',
            value.nonPaye.toFixed(2) + '€',
            value.offert.toFixed(2) + '€',
            value.coutsSalariaux.toFixed(2) + '€',
            value.fraisFonctionnement.toFixed(2) + '€',
            beneficeNet.toFixed(2) + '€'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Résumé financier");
    XLSX.writeFile(wb, 'Resume_financier.xlsx');
};

// Ajouter cette fonction pour exporter le résumé annuel
window.exporterResumeAnnuel = function() {
    try {
        const totaux = calculerTotalParStage();
        const wb = XLSX.utils.book_new();
        const data = [['Stage', 'Semaine', 'Revenus', 'Coûts salariaux', 'Frais fonctionnement', 'Bénéfice net']];

        const stagesPossibles = [
            'VTT Initiation',
            'VTT Perfectionnement',
            'Danse',
            'Créativité/Culinaire',
            'Multisports'
        ];

        const semaines = [
            'Pâques S1 2025',
            'Pâques S2 2025',
            'Été S1 2025',
            'Été S2 2025',
            'Été S3 2025',
            'Été S4 2025',
            'Toussaint 2025'
        ];

        stagesPossibles.forEach(stage => {
            semaines.forEach(semaine => {
                const key = `${stage}-${semaine}`;
                const donnees = totaux[key] || { 
                    total: 0, 
                    coutsSalariaux: 0, 
                    fraisFonctionnement: 0 
                };

                const beneficeNet = donnees.total - donnees.coutsSalariaux - donnees.fraisFonctionnement;
                
                data.push([
                    stage,
                    semaine,
                    donnees.total.toFixed(2) + '€',
                    donnees.coutsSalariaux.toFixed(2) + '€',
                    donnees.fraisFonctionnement.toFixed(2) + '€',
                    beneficeNet.toFixed(2) + '€'
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Résumé annuel");
        XLSX.writeFile(wb, 'Resume_annuel.xlsx');
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
    }
};

// Au début du fichier, après les autres fonctions window.*
window.rechercherGlobal = function(query) {
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    const resultsInscriptions = inscriptions.filter(i => 
        i.nom.toLowerCase().includes(query.toLowerCase())
    );

    const resultsAnimateurs = animateurs.filter(a => 
        a.nom.toLowerCase().includes(query.toLowerCase())
    );

    let html = '';
    if (resultsInscriptions.length > 0) {
        html += '<h5>Enfants inscrits</h5>';
        resultsInscriptions.forEach((inscription, index) => {
            const inscriptionIndex = inscriptions.findIndex(i => i === inscription);
            html += `
                <div class="search-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${inscription.nom}</strong> - ${inscription.stage} (${inscription.semaine})<br>
                        <small>Parents: ${inscription.parents1.nom}</small><br>
                        <small>Tél: ${inscription.parents1.telephone}</small>
                    </div>
                    <button class="btn btn-sm btn-info" onclick="telechargerFicheInformation(${inscriptionIndex})">
                        <i class="bi bi-file-earmark-text"></i> Fiche info
                    </button>
                </div>`;
        });
    }

    if (resultsAnimateurs.length > 0) {
        html += '<h5>Animateurs</h5>';
        resultsAnimateurs.forEach(a => {
            html += `<div class="search-item">
                <strong>${a.nom}</strong> - ${a.stage} (${a.semaine})<br>
                <small>Tél: ${a.telephone}</small>
            </div>`;
        });
    }

    document.getElementById('searchResults').innerHTML = html || '<p>Aucun résultat trouvé</p>';
};

// Au début du fichier, après les variables globales
window.afficherInscriptions = function(stageFiltre = null) {
    const table = document.getElementById('inscriptionsTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';
    
    let semaineActuelle = '';
    const inscriptionsTriees = [...inscriptions].sort((a, b) => a.semaine.localeCompare(b.semaine));
    
    inscriptionsTriees.forEach((inscription, index) => {
        if (stageFiltre && inscription.stage !== stageFiltre) return;
        
        if (inscription.semaine !== semaineActuelle) {
            semaineActuelle = inscription.semaine;
            const rowSemaine = table.insertRow();
            rowSemaine.innerHTML = `
                <td colspan="6" class="table-secondary">
                    <strong>${semaineActuelle}</strong>
                </td>
            `;
        }

        const row = table.insertRow();
        row.innerHTML = `
            <td>${inscription.nom}</td>
            <td>${inscription.stage}</td>
            <td>${inscription.semaine}</td>
            <td>${inscription.montant}€</td>
            <td>
                <button class="btn btn-sm ${getBadgeClass(inscription.paiement)}" 
                        onclick="changerStatutPaiement(${index})"
                        title="Changer le statut de paiement">
                    ${inscription.paiement}
                </button>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-info" onclick="telechargerFicheInformation(${index})"
                            title="Télécharger la fiche d'information">
                        <i class="bi bi-file-earmark-text"></i>
                    </button>
                    <button class="btn btn-warning" onclick="modifierInscription(${index})"
                            title="Modifier l'inscription">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-primary" onclick="dupliquerInscription(${index})"
                            title="Dupliquer l'inscription">
                        <i class="bi bi-files"></i>
                    </button>
                    <button class="btn btn-danger" onclick="desinscrireEnfant(${index})"
                            title="Désinscrire l'enfant">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
    });
    
    afficherResume(stageFiltre);
    afficherResumeInscriptions(stageFiltre);
}

// Déplacer aussi la fonction getBadgeClass
function getBadgeClass(statut) {
    switch(statut) {
        case 'Payé':
            return 'btn-success';
        case 'Liquide':
            return 'btn-info';
        case 'Non payé':
            return 'btn-warning';
        default:
            return 'btn-secondary';
    }
} 