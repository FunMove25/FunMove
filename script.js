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
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    const wb = XLSX.utils.book_new();
    const COUT_ANIMATEUR = 450;
    const COUT_AIDE = 225;
    
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
    
    const resumeData = [];
    
    stages.forEach(stage => {
        const stageData = {
            'Stage': stage,
        };
        let totalStage = 0;

        semaines.forEach(semaine => {
            // Calculer les revenus
            const inscrits = inscriptions.filter(i => 
                i.stage === stage && i.semaine === semaine
            );
            const revenus = inscrits.reduce((sum, i) => sum + parseFloat(i.montant), 0);
            stageData[semaine + ' Revenus'] = revenus.toFixed(2) + '€';

            // Calculer les coûts salariaux
            const animateursStage = animateurs.filter(a => 
                a.stage === stage && a.semaine === semaine
            );
            const coutsSalariaux = animateursStage.reduce((sum, a) => 
                sum + (a.role === 'Animateur' ? COUT_ANIMATEUR : COUT_AIDE), 0
            );
            stageData[semaine + ' Coûts salariaux'] = '-' + coutsSalariaux.toFixed(2) + '€';

            // Calculer le bénéfice net
            const beneficeNet = revenus - coutsSalariaux;
            stageData[semaine + ' Bénéfice net'] = beneficeNet.toFixed(2) + '€';
            totalStage += beneficeNet;
        });

        stageData['Total stage'] = totalStage.toFixed(2) + '€';
        resumeData.push(stageData);
    });

    // Ajouter une ligne pour les totaux
    const totalsSemaine = {
        'Stage': 'TOTAL'
    };
    
    let totalAnnuel = 0;
    semaines.forEach(semaine => {
        const revenus = inscriptions
            .filter(i => i.semaine === semaine)
            .reduce((sum, i) => sum + parseFloat(i.montant), 0);
        totalsSemaine[semaine + ' Revenus'] = revenus.toFixed(2) + '€';
        
        const coutsSalariaux = animateurs
            .filter(a => a.semaine === semaine)
            .reduce((sum, a) => sum + (a.role === 'Animateur' ? COUT_ANIMATEUR : COUT_AIDE), 0);
        totalsSemaine[semaine + ' Coûts salariaux'] = '-' + coutsSalariaux.toFixed(2) + '€';
        
        const beneficeNet = revenus - coutsSalariaux;
        totalsSemaine[semaine + ' Bénéfice net'] = beneficeNet.toFixed(2) + '€';
        totalAnnuel += beneficeNet;
    });
    
    totalsSemaine['Total stage'] = totalAnnuel.toFixed(2) + '€';
    resumeData.push(totalsSemaine);

    const ws = XLSX.utils.json_to_sheet(resumeData);

    // Ajuster la largeur des colonnes pour les nouvelles colonnes
    const wscols = [];
    Object.keys(resumeData[0]).forEach(key => {
        if (key === 'Stage') {
            wscols.push({wch: 20}); // Plus large pour le nom du stage
        } else if (key.includes('Coûts salariaux')) {
            wscols.push({wch: 20}); // Plus large pour "Coûts salariaux"
        } else if (key.includes('Bénéfice net')) {
            wscols.push({wch: 18}); // Plus large pour "Bénéfice net"
        } else if (key.includes('Revenus')) {
            wscols.push({wch: 18}); // Plus large pour "Revenus"
        } else {
            wscols.push({wch: 15}); // Largeur par défaut pour les autres colonnes
        }
    });
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

window.exporterCoutsSalariaux = function() {
    const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];
    const wb = XLSX.utils.book_new();
    const COUT_ANIMATEUR = 450;
    const COUT_AIDE = 225;

    const semaines = [
        'Pâques 2025',
        'Été S1 2025',
        'Été S2 2025',
        'Été S3 2025',
        'Été S4 2025',
        'Toussaint 2025'
    ];

    semaines.forEach(semaine => {
        const stages = [
            'VTT Débutant',
            'VTT Intermédiaire',
            'VTT Confirmé',
            'Danse',
            'Artistique/Culinaire',
            'Multisport'
        ];

        const coutsSalariaux = stages.map(stage => {
            const ligne = {
                'Stage': stage,
                'Animateur': '',
                'Nom Animateur': '',
                'Aide animateur': '',
                'Nom Aide': '',
                'Budget': '0€'
            };

            // Trouver les animateurs pour ce stage et cette semaine
            const animateursStage = animateurs.filter(a => 
                a.stage === stage && a.semaine === semaine
            );

            if (animateursStage.length > 0) {
                let budget = 0;
                animateursStage.forEach(a => {
                    if (a.role === 'Animateur') {
                        ligne['Animateur'] = 'X';
                        ligne['Nom Animateur'] = a.nom;
                        budget += COUT_ANIMATEUR;
                    } else {
                        ligne['Aide animateur'] = 'X';
                        ligne['Nom Aide'] = a.nom;
                        budget += COUT_AIDE;
                    }
                });
                ligne['Budget'] = budget + '€';
            }

            return ligne;
        });

        // Calculer les totaux pour cette semaine
        let totalAnimateurs = 0;
        let totalAides = 0;
        animateurs
            .filter(a => a.semaine === semaine)
            .forEach(a => {
                if (a.role === 'Animateur') totalAnimateurs += COUT_ANIMATEUR;
                else totalAides += COUT_AIDE;
            });

        // Ajouter la ligne des totaux
        coutsSalariaux.push({
            'Stage': 'TOTAL',
            'Animateur': totalAnimateurs + '€',
            'Nom Animateur': '',
            'Aide animateur': totalAides + '€',
            'Nom Aide': '',
            'Budget': (totalAnimateurs + totalAides) + '€'
        });

        const ws = XLSX.utils.json_to_sheet(coutsSalariaux);

        // Définir la largeur des colonnes
        const wscols = [
            {wch: 20}, // Stage
            {wch: 12}, // Animateur
            {wch: 25}, // Nom Animateur
            {wch: 12}, // Aide animateur
            {wch: 25}, // Nom Aide
            {wch: 15}  // Budget
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
                        bold: R === 0 || R === coutsSalariaux.length - 1
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

        XLSX.utils.book_append_sheet(wb, ws, semaine);
    });

    // Après la boucle semaines.forEach, ajouter une feuille de total général
    const totalGeneral = {
        'Stage': 'TOTAL GÉNÉRAL',
        'Animateur': 0,
        'Nom Animateur': '',
        'Aide animateur': 0,
        'Nom Aide': '',
        'Budget': 0
    };

    animateurs.forEach(a => {
        if (a.role === 'Animateur') {
            totalGeneral['Animateur'] += COUT_ANIMATEUR;
        } else {
            totalGeneral['Aide animateur'] += COUT_AIDE;
        }
        totalGeneral['Budget'] += (a.role === 'Animateur' ? COUT_ANIMATEUR : COUT_AIDE);
    });

    // Formater les montants
    totalGeneral['Animateur'] = totalGeneral['Animateur'] + '€';
    totalGeneral['Aide animateur'] = totalGeneral['Aide animateur'] + '€';
    totalGeneral['Budget'] = totalGeneral['Budget'] + '€';

    const wsTotal = XLSX.utils.json_to_sheet([totalGeneral]);

    // Appliquer les styles au total général
    const wscols = [
        {wch: 20}, // Stage
        {wch: 12}, // Animateur
        {wch: 25}, // Nom Animateur
        {wch: 12}, // Aide animateur
        {wch: 25}, // Nom Aide
        {wch: 15}  // Budget
    ];
    wsTotal['!cols'] = wscols;

    // Ajouter des styles
    const range = XLSX.utils.decode_range(wsTotal['!ref']);
    for(let R = range.s.r; R <= range.e.r; ++R) {
        for(let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = {c:C, r:R};
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if(!wsTotal[cell_ref]) continue;

            wsTotal[cell_ref].s = {
                font: { bold: true },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center'
                },
                border: {
                    top: {style: 'medium'},
                    bottom: {style: 'medium'},
                    left: {style: 'medium'},
                    right: {style: 'medium'}
                }
            };
        }
    }

    XLSX.utils.book_append_sheet(wb, wsTotal, "Total Général");

    XLSX.writeFile(wb, 'Couts_salariaux_animateurs.xlsx');
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('inscriptionForm');
    const table = document.getElementById('inscriptionsTable').getElementsByTagName('tbody')[0];
    let inscriptions = JSON.parse(localStorage.getItem('inscriptions')) || [];
    let animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];

    function calculerTotalParStage() {
        const totaux = {};
        const COUT_ANIMATEUR = 450;
        const COUT_AIDE = 225;
        const animateurs = JSON.parse(localStorage.getItem('animateurs')) || [];

        inscriptions.forEach(inscription => {
            const key = `${inscription.stage}-${inscription.semaine}`;
            if (!totaux[key]) {
                totaux[key] = {
                    total: 0,
                    paye: 0,
                    nonPaye: 0,
                    coutsSalariaux: 0
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
            const totauxParSemaine = {};
            Object.keys(semaines).forEach(semaine => {
                totauxParSemaine[semaine] = {
                    count: 0,
                    participants: [],
                    capaciteMax: CAPACITE_MAX * 6 // 6 stages différents
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
                            ${donnees.count > 0 ? `
                                <div class="mt-2">
                                    <strong>Participants:</strong><br>
                                    ${donnees.participants.join(', ')}
                                </div>
                            ` : 'Aucun inscrit'}
                        </div>`;
                }
            }
            html += '</div>';
        }

        summaryDiv.innerHTML = html || '<p>Aucune donnée disponible.</p>';
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
                <td>
                    <button class="btn btn-sm ${inscription.paiement === 'Payé' ? 'btn-success' : 'btn-warning'}" 
                            onclick="changerStatutPaiement(${index})">
                        ${inscription.paiement}
                    </button>
                </td>
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
            chartDiv.style.marginBottom = '20px';
            const canvas = document.createElement('canvas');
            chartDiv.appendChild(canvas);
            chartContainer.appendChild(chartDiv);

            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: ['Payé', 'Non payé', 'Coûts salariaux'],
                    datasets: [{
                        data: [
                            value.paye,
                            value.nonPaye,
                            value.coutsSalariaux
                        ],
                        backgroundColor: [
                            '#00B050', // Vert pour payé
                            '#FF6B00', // Orange pour non payé
                            '#FF0000'  // Rouge pour coûts salariaux
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
                                boxWidth: 20,
                                padding: 20,
                                color: '#333333'
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
}); 