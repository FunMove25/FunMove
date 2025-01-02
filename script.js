// Déplacer cette fonction en dehors du DOMContentLoaded, au début du fichier
function calculerTotalParStage() {
    const totaux = {};
    const COUT_ANIMATEUR = 450;
    const COUT_AIDE = 225;
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
                coutsSalariaux: 0,
                fraisFonctionnement: 0
            };
            
            // Calculer les coûts salariaux pour ce stage/semaine
            const animateursStage = animateurs.filter(a => 
                a.stage === inscription.stage && 
                a.semaine === inscription.semaine
            );
            totaux[key].coutsSalariaux = animateursStage.reduce((sum, a) => 
                sum + (a.role === 'Animateur' ? COUT_ANIMATEUR : COUT_AIDE), 0
            );
        }
        const montant = parseFloat(inscription.montant);
        totaux[key].total += montant;
        
        switch(inscription.paiement) {
            case 'Payé':
                totaux[key].paye += montant;
                break;
            case 'Non payé':
                totaux[key].nonPaye += montant;
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

let fraisFonctionnement = JSON.parse(localStorage.getItem('fraisFonctionnement')) || [];

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('inscriptionForm');
    const table = document.getElementById('inscriptionsTable').getElementsByTagName('tbody')[0];
    let inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    let animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];

    function afficherResume(stageFiltre = null) {
        const totaux = calculerTotalParStage();
        const summaryDiv = document.getElementById('financialSummary');
        let html = '';
        
        for (const [key, value] of Object.entries(totaux)) {
            const [stage, semaine] = key.split('-');
            
            if (stageFiltre) {
                if (stageFiltre === 'vtt' && !stage.toLowerCase().includes('vtt')) continue;
                if (stageFiltre === 'artistique-culinaire' && stage !== 'Artistique/Culinaire') continue;
                else if (stageFiltre !== 'vtt' && !stage.toLowerCase().startsWith(stageFiltre.toLowerCase())) continue;
            }

            const beneficeNet = value.total - value.coutsSalariaux;
            html += `
                <div class="mb-2">
                    <strong>${stage} - ${semaine}</strong><br>
                    Total revenus: ${value.total.toFixed(2)}€<br>
                    Payé: ${value.paye.toFixed(2)}€<br>
                    Non payé: ${value.nonPaye.toFixed(2)}€<br>
                    Coûts salariaux: -${value.coutsSalariaux.toFixed(2)}€<br>
                    <strong>Bénéfice net: ${beneficeNet.toFixed(2)}€</strong>
                </div>
            `;
        }
        
        if (html === '') {
            html = '<p>Aucune donnée financière disponible pour ce type de stage.</p>';
        }
        
        summaryDiv.innerHTML = html;
        creerGraphiques(totaux, stageFiltre);
    }

    function calculerResumeInscriptions() {
        const resume = {};
        const stages = ['VTT Débutant', 'VTT Intermédiaire', 'VTT Confirmé', 'Danse', 'Artistique/Culinaire', 'Multisport'];
        const semaines = {
            'Pâques 2025': 'du 5 au 9 mai 2025',
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
        const { resume, semaines } = calculerResumeInscriptions();
        const summaryDiv = document.getElementById('inscriptionSummary');
        let html = '';
        const CAPACITE_MAX = 20;

        if (stageFiltre === 'tous') {
            // Calculer les totaux par semaine
            Object.keys(semaines).forEach(semaine => {
                totauxParSemaine[semaine] = {
                    count: 0,
                    participants: [],
                    capaciteMax: 20 // 20 places par semaine
                };
            });

            // Remplir les totaux
            Object.values(resume).forEach(stageDonnees => {
                Object.entries(stageDonnees).forEach(([semaine, donnees]) => {
                    totauxParSemaine[semaine].count += donnees.count;
                    totauxParSemaine[semaine].participants.push(...donnees.participants);
                });
            });

            // Générer le HTML pour chaque semaine
            html += '<div class="summary-section">';
            Object.entries(totauxParSemaine).forEach(([semaine, donnees]) => {
                const semaineDetails = semaines[semaine];
                const placesRestantes = donnees.capaciteMax - donnees.count;
                const progressPercentage = (donnees.count / donnees.capaciteMax) * 100;

                let progressColor;
                if (donnees.count >= donnees.capaciteMax) {
                    progressColor = 'bg-danger';
                } else if (donnees.count >= donnees.capaciteMax * 0.8) {
                    progressColor = 'bg-warning';
                } else {
                    progressColor = 'bg-success';
                }

                html += `
                    <div class="mb-4">
                        <h5>
                            ${semaine} (${semaineDetails})
                            <span class="badge bg-${progressColor} ms-2">
                                ${donnees.count}/${donnees.capaciteMax}
                            </span>
                        </h5>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>Inscrits: ${donnees.count}/${donnees.capaciteMax}</span>
                            <span>${placesRestantes > 0 ? `Places restantes: ${placesRestantes}` : 'COMPLET'}</span>
                        </div>
                        <div class="progress" style="height: 20px; margin: 10px 0;">
                            <div class="progress-bar ${progressColor}" 
                                 role="progressbar" 
                                 style="width: ${progressPercentage}%" 
                                 aria-valuenow="${donnees.count}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="${donnees.capaciteMax}">
                                ${donnees.count}/${donnees.capaciteMax}
                            </div>
                        </div>
                        ${donnees.count > 0 ? `
                            <div class="mt-2">
                                <strong>Participants:</strong><br>
                                ${donnees.participants.join(', ')}
                            </div>
                        ` : 'Aucun inscrit'}
                    </div>`;
            });
            html += '</div>';
        } else {
            // Affichage par type de stage
            html += '<div class="summary-section">';
            for (const [stage, semaineDonnees] of Object.entries(resume)) {
                if (stageFiltre === 'vtt' && !stage.toLowerCase().includes('vtt')) continue;
                if (stageFiltre === 'artistique-culinaire' && stage !== 'Artistique/Culinaire') continue;
                if (stageFiltre === 'danse' && stage !== 'Danse') continue;
                if (stageFiltre === 'multisport' && stage !== 'Multisport') continue;

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
                                    ${donnees.count}/${CAPACITE_MAX}
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
        const inscriptionsFiltrees = stageFiltre ? 
            inscriptions.filter(i => {
                if (stageFiltre === 'vtt') {
                    return i.stage.toLowerCase().includes('vtt');
                }
                if (stageFiltre === 'artistique-culinaire') {
                    return i.stage === 'Artistique/Culinaire';
                }
                return i.stage.toLowerCase().startsWith(stageFiltre.toLowerCase());
            }) : 
            inscriptions;

        table.innerHTML = '';
        inscriptionsFiltrees.forEach((inscription, index) => {
            const row = table.insertRow();
            row.innerHTML = `
                <td>${inscription.nom}</td>
                <td>${inscription.stage}</td>
                <td>${inscription.semaine}</td>
                <td>${inscription.montant}€</td>
                <td>
                    <button class="btn btn-sm ${inscription.paiement === 'Payé' ? 'btn-success' : 'btn-warning'}" 
                            onclick="changerStatutPaiement(${index})">
                        ${inscription.paiement}
                    </button>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="supprimerInscription(${index})">
                        Désinscrire
                    </button>
                </td>
            `;
        });
        
        afficherResume(stageFiltre);
        afficherResumeInscriptions(stageFiltre);
    }

    function afficherAnimateurs() {
        const tableAnimateurs = document.getElementById('animateursTable').getElementsByTagName('tbody')[0];
        tableAnimateurs.innerHTML = '';
        
        animateurs.forEach((animateur, index) => {
            const row = tableAnimateurs.insertRow();
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
        animateurs.splice(index, 1);
        localStorage.setItem('animateurs', JSON.stringify(animateurs));
        afficherAnimateurs();
    };

    document.getElementById('animateurForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nouveauAnimateur = {
            nom: document.getElementById('nomAnimateur').value,
            telephone: document.getElementById('telephoneAnimateur').value,
            role: document.getElementById('roleAnimateur').value,
            stage: document.getElementById('stageAnimateur').value,
            semaine: document.getElementById('semaineAnimateur').value
        };

        const animateurExistant = animateurs.find(a => 
            a.stage === nouveauAnimateur.stage && 
            a.semaine === nouveauAnimateur.semaine && 
            a.role === nouveauAnimateur.role
        );

        if (animateurExistant && nouveauAnimateur.role === 'Animateur') {
            alert('Un animateur principal est déjà assigné à ce stage pour cette semaine.');
            return;
        }

        if (animateurExistant && nouveauAnimateur.role === 'Aide') {
            alert('Un aide animateur est déjà assigné à ce stage pour cette semaine.');
            return;
        }

        animateurs.push(nouveauAnimateur);
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
            sexe: document.getElementById('sexe').value,
            age: document.getElementById('age').value,
            stage: stage,
            semaine: semaine,
            parents: document.getElementById('parents').value,
            telephone: document.getElementById('telephone').value,
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

    // Afficher les inscriptions au chargement
    afficherInscriptions();
    afficherAnimateurs();

    // Ajouter dans le DOMContentLoaded
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
            
            if (stageFiltre) {
                if (stageFiltre === 'vtt' && !stage.toLowerCase().includes('vtt')) continue;
                if (stageFiltre === 'artistique-culinaire' && stage !== 'Artistique/Culinaire') continue;
                else if (stageFiltre !== 'vtt' && !stage.toLowerCase().startsWith(stageFiltre.toLowerCase())) continue;
            }

            const chartDiv = document.createElement('div');
            chartDiv.style.marginBottom = '20px';

            const canvas = document.createElement('canvas');
            chartDiv.appendChild(canvas);
            chartContainer.appendChild(chartDiv);

            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: ['Payé', 'Non payé', 'Coûts salariaux', 'Frais de fonctionnement'],
                    datasets: [{
                        data: [
                            value.paye,
                            value.nonPaye,
                            value.coutsSalariaux,
                            value.fraisFonctionnement || 0
                        ],
                        backgroundColor: [
                            '#00B050', // Vert pour payé
                            '#FF6B00', // Orange pour non payé
                            '#FF0000', // Rouge pour coûts salariaux
                            '#800080'  // Violet pour frais de fonctionnement
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    backgroundColor: 'transparent',
                    elements: {
                        arc: {
                            borderWidth: 0
                        }
                    },
                    layout: {
                        padding: 20
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `${stage} - ${semaine}`,
                            font: {
                                size: 14
                            },
                            color: '#333333'
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 15,
                                font: {
                                    size: 11
                                },
                                color: '#333333'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    return `${context.label}: ${value.toFixed(2)}€`;
                                }
                            }
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

    // Ajouter la fonction pour changer le statut de paiement
    window.changerStatutPaiement = function(index) {
        inscriptions[index].paiement = inscriptions[index].paiement === 'Payé' ? 'Non payé' : 'Payé';
        localStorage.setItem('inscriptions', JSON.stringify(inscriptions));
        afficherInscriptions();
    };

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
});

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

// Ajouter cette fonction pour exporter le résumé financier
window.exporterResumeFinancier = function() {
    const totaux = calculerTotalParStage();
    const wb = XLSX.utils.book_new();
    const data = [];

    for (const [key, value] of Object.entries(totaux)) {
        const [stage, semaine] = key.split('-');
        const beneficeNet = value.total - value.coutsSalariaux - value.fraisFonctionnement;
        
        data.push({
            'Stage': stage,
            'Semaine': semaine,
            'Total revenus': value.total.toFixed(2) + '€',
            'Payé': value.paye.toFixed(2) + '€',
            'Non payé': value.nonPaye.toFixed(2) + '€',
            'Coûts salariaux': value.coutsSalariaux.toFixed(2) + '€',
            'Frais de fonctionnement': value.fraisFonctionnement.toFixed(2) + '€',
            'Bénéfice net': beneficeNet.toFixed(2) + '€'
        });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Définir la largeur des colonnes
    const wscols = [
        {wch: 20}, // Stage
        {wch: 25}, // Semaine
        {wch: 15}, // Total revenus
        {wch: 15}, // Payé
        {wch: 15}, // Non payé
        {wch: 15}, // Coûts salariaux
        {wch: 20}, // Frais de fonctionnement
        {wch: 15}  // Bénéfice net
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Résumé financier");
    XLSX.writeFile(wb, 'Resume_financier.xlsx');
};

// Ajouter cette fonction pour exporter le résumé annuel
window.exporterResumeAnnuel = function() {
    const totaux = calculerTotalParStage();
    const wb = XLSX.utils.book_new();
    const data = [];

    // Définir tous les stages possibles
    const stagesPossibles = [
        'VTT Débutant',
        'VTT Intermédiaire',
        'VTT Confirmé',
        'Danse',
        'Artistique/Culinaire',
        'Multisport'
    ];

    // Définir toutes les semaines dans l'ordre
    const semaines = [
        'Pâques 2025',
        'Été S1 2025',
        'Été S2 2025',
        'Été S3 2025',
        'Été S4 2025',
        'Toussaint 2025'
    ];

    // Créer l'en-tête du tableau
    const headers = [
        ['Stage', 'Semaine', 'Revenus', 'Coûts salariaux', 'Frais fonctionnement', 'Bénéfice net']
    ];

    // Remplir les données pour chaque stage possible
    stagesPossibles.forEach(stage => {
        semaines.forEach(semaine => {
            const key = `${stage}-${semaine}`;
            const donnees = totaux[key] || { total: 0, coutsSalariaux: 0, fraisFonctionnement: 0 };
            const beneficeNet = donnees.total - donnees.coutsSalariaux - donnees.fraisFonctionnement;
            
            data.push([
                stage,
                semaine,
                donnees.total.toFixed(2) + '€',
                donnees.coutsSalariaux.toFixed(2) + '€',
                (donnees.fraisFonctionnement || 0).toFixed(2) + '€',
                beneficeNet.toFixed(2) + '€'
            ]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);

    // Définir la largeur des colonnes
    ws['!cols'] = [
        { wch: 20 }, // Stage
        { wch: 15 }, // Semaine
        { wch: 12 }, // Revenus
        { wch: 15 }, // Coûts salariaux
        { wch: 20 }, // Frais fonctionnement
        { wch: 15 }  // Bénéfice net
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Résumé annuel");
    XLSX.writeFile(wb, 'Resume_annuel.xlsx');
}; 