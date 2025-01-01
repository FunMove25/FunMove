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
            'Allergies': i.allergies,
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
            {wch: 30},  // Allergies
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
        ws['!rows'] = Array(listePresence.length + 1).fill({ hpt: 35 }); // Réduire la hauteur de 45 à 35

        // Ajouter des styles
        const range = XLSX.utils.decode_range(ws['!ref']);
        for(let R = range.s.r; R <= range.e.r; ++R) {
            for(let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = {c:C, r:R};
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if(!ws[cell_ref]) continue;

                // Style de base pour toutes les cellules
                ws[cell_ref].s = {
                    border: {
                        top: {style: 'thin', color: {rgb: "000000"}},
                        bottom: {style: 'thin', color: {rgb: "000000"}},
                        left: {style: 'thin', color: {rgb: "000000"}},
                        right: {style: 'thin', color: {rgb: "000000"}}
                    },
                    alignment: {
                        vertical: 'center',
                        horizontal: 'center',
                        wrapText: true
                    },
                    font: {
                        name: 'Arial Unicode MS',
                        sz: 12
                    }
                };

                // Style spécial pour l'en-tête
                if(R === 0) {
                    ws[cell_ref].s = {
                        ...ws[cell_ref].s,
                        fill: {
                            fgColor: {rgb: "CCCCCC"},
                            patternType: 'solid'
                        },
                        font: {
                            bold: true,
                            sz: 11
                        },
                        border: {
                            top: {style: 'medium', color: {rgb: "000000"}},
                            bottom: {style: 'medium', color: {rgb: "000000"}},
                            left: {style: 'medium', color: {rgb: "000000"}},
                            right: {style: 'medium', color: {rgb: "000000"}}
                        }
                    };
                }

                // Style spécial pour les colonnes des jours
                if (C >= 7) { // À partir de la colonne "Lundi"
                    ws[cell_ref].s.border = {
                        top: {style: 'medium', color: {rgb: "000000"}},
                        bottom: {style: 'medium', color: {rgb: "000000"}},
                        left: {style: 'medium', color: {rgb: "000000"}},
                        right: {style: 'medium', color: {rgb: "000000"}}
                    };
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, "Liste de présence");
        XLSX.writeFile(wb, `Liste_presence_${stage}_${semaine}.xlsx`);
    }
};

window.exporterResumesFinanciers = function() {
    // Récupérer les inscriptions du localStorage
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    
    const wb = XLSX.utils.book_new();
    const semaines = [
        'Pâques 2025',
        'Été S1 2025',
        'Été S2 2025',
        'Été S3 2025',
        'Été S4 2025',
        'Toussaint 2025'
    ];
    
    semaines.forEach(semaine => {
        // Créer les données pour cette semaine
        const stagesData = [];
        let totalSemaine = {
            total: 0,
            paye: 0,
            nonPaye: 0
        };

        // Parcourir tous les stages pour cette semaine
        ['VTT Débutant', 'VTT Intermédiaire', 'VTT Confirmé', 'Danse', 'Artistique/Culinaire', 'Multisport'].forEach(stage => {
            const inscrits = inscriptions.filter(i => i.stage === stage && i.semaine === semaine);
            const donnees = {
                'Stage': stage,
                'Nombre d\'inscrits': inscrits.length,
                'Montant total': 0,
                'Montant payé': 0,
                'Montant non payé': 0,
                '% payé': '0%',
                '% non payé': '0%'
            };

            inscrits.forEach(inscrit => {
                const montant = parseFloat(inscrit.montant);
                donnees['Montant total'] += montant;
                totalSemaine.total += montant;

                switch(inscrit.paiement) {
                    case 'Payé':
                        donnees['Montant payé'] += montant;
                        totalSemaine.paye += montant;
                        break;
                    case 'Non payé':
                        donnees['Montant non payé'] += montant;
                        totalSemaine.nonPaye += montant;
                        break;
                }
            });

            // Calculer les pourcentages
            if (donnees['Montant total'] > 0) {
                donnees['% payé'] = ((donnees['Montant payé'] / donnees['Montant total']) * 100).toFixed(1) + '%';
                donnees['% non payé'] = ((donnees['Montant non payé'] / donnees['Montant total']) * 100).toFixed(1) + '%';
            }

            // Formater les montants
            donnees['Montant total'] = donnees['Montant total'].toFixed(2) + '€';
            donnees['Montant payé'] = donnees['Montant payé'].toFixed(2) + '€';
            donnees['Montant non payé'] = donnees['Montant non payé'].toFixed(2) + '€';

            stagesData.push(donnees);
        });

        // Ajouter une ligne pour le total de la semaine
        stagesData.push({
            'Stage': 'TOTAL SEMAINE',
            'Nombre d\'inscrits': inscriptions.filter(i => i.semaine === semaine).length,
            'Montant total': totalSemaine.total.toFixed(2) + '€',
            'Montant payé': totalSemaine.paye.toFixed(2) + '€',
            'Montant non payé': totalSemaine.nonPaye.toFixed(2) + '€',
            '% payé': totalSemaine.total > 0 ? ((totalSemaine.paye / totalSemaine.total) * 100).toFixed(1) + '%' : '0%',
            '% non payé': totalSemaine.total > 0 ? ((totalSemaine.nonPaye / totalSemaine.total) * 100).toFixed(1) + '%' : '0%'
        });

        // Créer la feuille Excel pour cette semaine
        const ws = XLSX.utils.json_to_sheet(stagesData);

        // Ajuster la largeur des colonnes
        const wscols = [
            {wch: 20}, // Stage
            {wch: 15}, // Nombre d'inscrits
            {wch: 15}, // Montant total
            {wch: 15}, // Montant payé
            {wch: 15}, // Montant non payé
            {wch: 10}, // % payé
            {wch: 10}, // % non payé
            {wch: 10}  // % acomptes
        ];
        ws['!cols'] = wscols;

        // Ajouter des styles
        for (let i = 0; i < stagesData.length; i++) {
            const row = String.fromCharCode(65); // 'A'
            const cellRef = row + (i + 1);
            if (!ws[cellRef]) continue;
            
            ws[cellRef].s = {
                font: {
                    bold: i === stagesData.length - 1 // Mettre en gras la dernière ligne (total)
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center'
                },
                border: {
                    top: {style: 'thin'},
                    bottom: {style: 'thin'},
                    left: {style: 'thin'},
                    right: {style: 'thin'}
                }
            };
        }

        XLSX.utils.book_append_sheet(wb, ws, semaine);
    });

    XLSX.writeFile(wb, 'Resume_financier_stages.xlsx');
};

window.exporterListeAnimateurs = function() {
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    const wb = XLSX.utils.book_new();
    
    const semaines = [
        'Pâques 2025',
        'Été S1 2025',
        'Été S2 2025',
        'Été S3 2025',
        'Été S4 2025',
        'Toussaint 2025'
    ];

    semaines.forEach(semaine => {
        const stagesData = [];
        
        ['VTT Débutant', 'VTT Intermédiaire', 'VTT Confirmé', 'Danse', 'Artistique/Culinaire', 'Multisport'].forEach(stage => {
            const animateursStage = animateurs.filter(a => a.stage === stage && a.semaine === semaine);
            const donnees = {
                'Stage': stage,
                'Animateur principal': '',
                'Téléphone animateur': '',
                'Aide animateur': '',
                'Téléphone aide': ''
            };

            animateursStage.forEach(animateur => {
                if (animateur.role === 'Animateur') {
                    donnees['Animateur principal'] = animateur.nom;
                    donnees['Téléphone animateur'] = animateur.telephone;
                } else {
                    donnees['Aide animateur'] = animateur.nom;
                    donnees['Téléphone aide'] = animateur.telephone;
                }
            });

            stagesData.push(donnees);
        });

        const ws = XLSX.utils.json_to_sheet(stagesData);

        // Définir la largeur des colonnes
        const wscols = [
            {wch: 20}, // Stage
            {wch: 25}, // Animateur principal
            {wch: 15}, // Téléphone animateur
            {wch: 25}, // Aide animateur
            {wch: 15}  // Téléphone aide
        ];
        ws['!cols'] = wscols;

        // Ajouter des styles
        const range = XLSX.utils.decode_range(ws['!ref']);
        for(let R = range.s.r; R <= range.e.r; ++R) {
            for(let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = {c:C, r:R};
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if(!ws[cell_ref]) continue;

                ws[cell_ref].s = {
                    border: {
                        top: {style: 'thin'},
                        bottom: {style: 'thin'},
                        left: {style: 'thin'},
                        right: {style: 'thin'}
                    },
                    alignment: {
                        vertical: 'center',
                        horizontal: 'center',
                        wrapText: true
                    }
                };

                // Style pour l'en-tête
                if(R === 0) {
                    ws[cell_ref].s.fill = {
                        fgColor: {rgb: "CCCCCC"},
                        patternType: 'solid'
                    };
                    ws[cell_ref].s.font = {
                        bold: true
                    };
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, semaine);
    });

    XLSX.writeFile(wb, 'Liste_animateurs.xlsx');
};

window.exporterResumeAnnuel = function() {
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    const wb = XLSX.utils.book_new();
    
    // Créer un tableau pour toutes les données
    const resumeData = [];
    let totalAnnuel = 0;
    
    const semaines = [
        'Pâques 2025',
        'Été S1 2025',
        'Été S2 2025',
        'Été S3 2025',
        'Été S4 2025',
        'Toussaint 2025'
    ];

    const stages = [
        'VTT Débutant',
        'VTT Intermédiaire',
        'VTT Confirmé',
        'Danse',
        'Artistique/Culinaire',
        'Multisport'
    ];

    // Calculer les totaux pour chaque combinaison stage/semaine
    stages.forEach(stage => {
        const stageData = {
            'Stage': stage,
        };
        let totalStage = 0;

        semaines.forEach(semaine => {
            const inscrits = inscriptions.filter(i => 
                i.stage === stage && i.semaine === semaine
            );
            
            const total = inscrits.reduce((sum, i) => sum + parseFloat(i.montant), 0);
            stageData[semaine] = total.toFixed(2) + '€';
            totalStage += total;
        });

        stageData['Total stage'] = totalStage.toFixed(2) + '€';
        totalAnnuel += totalStage;
        resumeData.push(stageData);
    });

    // Ajouter une ligne pour les totaux par semaine
    const totalsSemaine = {
        'Stage': 'TOTAL PAR SEMAINE'
    };
    
    semaines.forEach(semaine => {
        const totalSemaine = inscriptions
            .filter(i => i.semaine === semaine)
            .reduce((sum, i) => sum + parseFloat(i.montant), 0);
        totalsSemaine[semaine] = totalSemaine.toFixed(2) + '€';
    });
    
    totalsSemaine['Total stage'] = totalAnnuel.toFixed(2) + '€';
    resumeData.push(totalsSemaine);

    // Créer la feuille Excel
    const ws = XLSX.utils.json_to_sheet(resumeData);

    // Ajuster la largeur des colonnes
    const wscols = [
        {wch: 20}, // Stage
        {wch: 15}, // Pâques
        {wch: 15}, // Été S1
        {wch: 15}, // Été S2
        {wch: 15}, // Été S3
        {wch: 15}, // Été S4
        {wch: 15}, // Toussaint
        {wch: 15}  // Total stage
    ];
    ws['!cols'] = wscols;

    // Ajouter des styles
    const range = XLSX.utils.decode_range(ws['!ref']);
    for(let R = range.s.r; R <= range.e.r; ++R) {
        for(let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = {c:C, r:R};
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if(!ws[cell_ref]) continue;

            ws[cell_ref].s = {
                font: {
                    bold: R === 0 || R === resumeData.length - 1
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center'
                },
                border: {
                    top: {style: 'thin'},
                    bottom: {style: 'thin'},
                    left: {style: 'thin'},
                    right: {style: 'thin'}
                }
            };
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Résumé annuel");
    XLSX.writeFile(wb, 'Resume_financier_annuel.xlsx');
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('inscriptionForm');
    const table = document.getElementById('inscriptionsTable').getElementsByTagName('tbody')[0];
    let inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    let animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];

    function calculerTotalParStage() {
        const totaux = {};
        inscriptions.forEach(inscription => {
            const key = `${inscription.stage}-${inscription.semaine}`;
            if (!totaux[key]) {
                totaux[key] = {
                    total: 0,
                    paye: 0,
                    nonPaye: 0
                };
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
        return totaux;
    }

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

            html += `
                <div class="mb-2">
                    <strong>${stage} - ${semaine}</strong><br>
                    Total: ${value.total.toFixed(2)}€<br>
                    Payé: ${value.paye.toFixed(2)}€<br>
                    Non payé: ${value.nonPaye.toFixed(2)}€
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

        for (const [stage, semaineDonnees] of Object.entries(resume)) {
            // Corriger la logique du filtre
            if (stageFiltre) {
                if (stageFiltre === 'vtt' && !stage.toLowerCase().includes('vtt')) continue;
                if (stageFiltre === 'artistique-culinaire' && stage !== 'Artistique/Culinaire') continue;
                if (stageFiltre === 'danse' && stage !== 'Danse') continue;
                if (stageFiltre === 'multisport' && stage !== 'Multisport') continue;
            }

            // Calculer le nombre total d'inscrits pour ce stage
            const totalInscrits = Object.values(semaineDonnees).reduce((total, donnees) => total + donnees.count, 0);
            const totalPlaces = CAPACITE_MAX * Object.keys(semaineDonnees).length;
            const placesRestantes = totalPlaces - totalInscrits;
            
            // Déterminer la couleur de l'indicateur
            let indicatorColor;
            if (totalInscrits >= totalPlaces) {
                indicatorColor = 'danger';
            } else if (totalInscrits >= totalPlaces * 0.8) {
                indicatorColor = 'warning';
            } else {
                indicatorColor = 'success';
            }

            html += `<div class="summary-section">
                <h5>
                    ${stage}
                    <span class="badge bg-${indicatorColor} ms-2">
                        ${totalInscrits}/${totalPlaces}
                    </span>
                </h5>`;
            
            for (const [semaine, donnees] of Object.entries(semaineDonnees)) {
                const semaineDetails = semaines[semaine];
                const placesRestantes = CAPACITE_MAX - donnees.count;
                const progressPercentage = (donnees.count / CAPACITE_MAX) * 100;
                
                // Déterminer la couleur de la barre de progression
                let progressColor;
                if (donnees.count >= CAPACITE_MAX) {
                    progressColor = 'bg-danger';  // Rouge si complet
                } else if (donnees.count >= CAPACITE_MAX * 0.8) {
                    progressColor = 'bg-warning';  // Orange si presque complet
                } else {
                    progressColor = 'bg-success';  // Vert si places disponibles
                }

                html += `
                    <div class="mb-3">
                        <strong>${semaine} (${semaineDetails})</strong><br>
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
                        ${donnees.count > 0 ? `
                            <div class="mt-2">
                                <strong>Participants:</strong><br>
                                ${donnees.participants.join(', ')}<br>
                                <button class="btn btn-sm btn-success mt-2" onclick="exporterListePresence('${stage}', '${semaine}')">
                                    Télécharger la liste des présences
                                </button>
                            </div>
                        ` : 'Aucun inscrit'}
                    </div>`;
            }
            html += '</div>';
        }

        summaryDiv.innerHTML = html || '<p>Aucune donnée disponible pour ce type de stage.</p>';
    }

    function afficherInscriptions(stageFiltre = null) {
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
                <td>${inscription.paiement}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="supprimerInscription(${index})">
                        Supprimer
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
            chartDiv.className = 'mb-4';
            chartDiv.style.maxWidth = '300px';
            
            const canvas = document.createElement('canvas');
            chartDiv.appendChild(canvas);
            chartContainer.appendChild(chartDiv);

            const total = value.paye + value.nonPaye;

            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: ['Payé', 'Non payé'],
                    datasets: [{
                        data: [
                            value.paye,
                            value.nonPaye
                        ],
                        backgroundColor: [
                            '#00B050', // Vert pour payé
                            '#FF6B00'  // Orange pour non payé
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${stage} - ${semaine}`,
                            font: {
                                size: 14
                            }
                        },
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ${value.toFixed(2)}€ (${percentage}%)`;
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
}); 