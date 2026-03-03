const TEMPLATES = [
    // ==================== BAC - Year 1 ====================
    {
        year: "bac",
        name: "BAC Sciences Expérimentales (شعبة العلوم التجريبية)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    "الدوال العددية والنهايات", "الدوال الأسية واللوغاريتمية", 
                    "المتتاليات العددية", "الاحتمالات", 
                    "الهندسة في الفضاء", "الأعداد المركبة", 
                    "الحساب التكاملي", "المعادلات التفاضلية"
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    "المتابعة الزمنية لتدفق كيميائي", "التحولات النووية", 
                    "الظواهر الكهربائية", "حالة التوازن الكيميائي", 
                    "الميكانيك", "الأسترة", "الاهتزازات الميكانيكية",
                    "الكهرومغناطيسية"
                ] 
            },
            { 
                name: "علوم الطبيعة والحياة", 
                chapters: [
                    "تركيب البروتين", "بنية البروتين ووظيفته", 
                    "النشاط الأنزيمي", "المناعة", 
                    "الاتصال العصبي", "التكاثر",
                    "التركيب الضوئي والتنفس", "التكتونية والجيولوجيا",
                    "الوراثة"
                ] 
            },
            { 
                name: "الفلسفة", 
                chapters: [
                    "المشكلة والإشكالية", "الإدراك والاحساس", 
                    "الذاكرة والخيال", "اللغة والفكر", 
                    "الشعور واللاشعور", "المادة الحية والمادة الجامدة", 
                    "الحقيقة", "العدالة", "الأخلاق"
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    "الأدب في عصر الضعف", "مدرسة الإحياء والبعث", 
                    "أدب المهجر والالتزام", "الشعر التعليمي", 
                    "فن المقال", "القصة والرواية", "النقد الأدبي"
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                chapters: [
                    "العقيدة الإسلامية", "الإسلام والرسالات", 
                    "العقل في القرآن", "الميراث", 
                    "المعاملات المالية", "فقه البيوع", 
                    "الجهاد", "الشهادة"
                ] 
            }
        ]
    },
    {
        year: "bac",
        name: "BAC Math & Technique Math (شعبة الرياضيات والتقني رياضي)",
        subjects: [
            { 
                name: "الرياضيات (متقدم)", 
                chapters: [
                    "الأعداد والحساب", "الدوال والاشتقاقية", 
                    "المتتاليات", "الأعداد المركبة", 
                    "الحساب التكاملي", "الاحتمالات", 
                    "القواسم والمضاعفات", "المعادلات التفاضلية",
                    "الهندسة التحليلية", "المصفوفات"
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    "المتابعة الزمنية", "التحولات النووية", 
                    "الكهرباء", "الميكانيك والنيوتن", 
                    "الاهتزازات الميكانيكية", "كيمياء توازن",
                    "الفيزياء النووية", "الليزر",
                    "الأمواج"
                ] 
            },
            { 
                name: "الهندسة التقنية", 
                chapters: [
                    "الآليات والمنطق", "مقاومة المواد", 
                    "دراسة الأنظمة", "الإنشاء الميكانيكي", 
                    "الإنشاء المدني", "التحكم الآلي",
                    "البرمجة", "الدوائر الإلكترونية"
                ] 
            },
            { 
                name: "الفلسفة", 
                chapters: [
                    "السؤال العلمي والفلسفي", "المشكلة والإشكالية", 
                    "الحقيقة", "الأخلاق", 
                    "المنطق", "التمييز"
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    "Grammar", "Vocabulary", 
                    "Reading Comprehension", "Writing",
                    "Technical English"
                ] 
            }
        ]
    },
    {
        year: "bac",
        name: "BAC Gestion et Economie (شعبة التسيير والاقتصاد)",
        subjects: [
            { 
                name: "التسيير المحاسبي والمالي", 
                chapters: [
                    "الاهتلاكات والمخزونات", "إعداد الميزانية والنتائج", 
                    "محاسبة التكاليف الكلية", "محاسبة التكاليف المتغيرة", 
                    "تحليل الميزانية", "التدفق المالي",
                    "القرار المالي", "الاستثمار"
                ] 
            },
            { 
                name: "الاقتصاد والمناجمت", 
                chapters: [
                    "النقود والأسعار", "النظام المصرفي", 
                    "التجارة الخارجية", "البطالة والتضخم", 
                    "القيادة والرقابة", "الاقتصاد الدولي",
                    "النمو الاقتصادي", "التنمية"
                ] 
            },
            { 
                name: "قانون", 
                chapters: [
                    "عقد البيع", "شركة المساهمة", 
                    "عقد العمل", "الضريبة على الدخل", 
                    "الملكية الفكرية", "القانون التجاري",
                    "النظام القانوني للمقاولات"
                ] 
            },
            { 
                name: "الرياضيات (تسيير)", 
                chapters: [
                    "المتتاليات", "الدوال العددية", 
                    "الإحصاء والاحتمالات", "الرياضيات المالية",
                    "النمذجة الرياضية", "المعادلات"
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    "Business English", "Communication", 
                    "Marketing", "Management"
                ] 
            }
        ]
    },
    {
        year: "bac",
        name: "BAC Lettres et Philosophie (شعبة الأدب والفلسفة)",
        subjects: [
            { 
                name: "الفلسفة", 
                chapters: [
                    "الإدراك والإحساس", "الذاكرة والخيال", 
                    "اللغة والفكر", "الشعور واللاشعور", 
                    "الأسرة والمجتمع", "الحقيقة والعدالة", 
                    "الأخلاق البيولوجية", "الحرية والمسؤولية",
                    "الوجود والعدم", "النظرية والممارسة"
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    "عصر الضعف", "عصر النهضة", 
                    "أدب المهجر", "الالتزام في الأدب العربي", 
                    "فن المقال والقصة", "الشعر العربي المعاصر",
                    "النقد الأدبي", "البلاغة"
                ] 
            },
            { 
                name: "التاريخ والجغرافيا", 
                chapters: [
                    "الحرب الباردة", "الثورة الجزائرية", 
                    "استعادة السيادة", "القوى الاقتصادية الكبرى", 
                    "دول الجنوب", "العولمة",
                    "الظواهر المناخية", "السكان"
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    "Literature", "Essay Writing", 
                    "Critical Analysis", "Communication"
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                chapters: [
                    "الفكر الإسلامي", "التاريخ الإسلامي", 
                    "المقاصد الشرعية", "أخلاقيات المهنة"
                ] 
            }
        ]
    },
    {
        year: "bac",
        name: "BAC Sciences Islamiques (شعبة العلوم الإسلامية)",
        subjects: [
            { 
                name: "العلوم الإسلامية", 
                chapters: [
                    "العقيدة الإسلامية", "أصول الفقه", 
                    "الفقه المقارن", "التفسير",
                    "الحديث", "الصرف",
                    "النحو", "البلاغة"
                ] 
            },
            { 
                name: "الفلسفة", 
                chapters: [
                    "مدخل إلى الفلسفة", "المشكلة والإشكالية", 
                    "الحقيقة", "الأخلاق",
                    "الوجود", "النفس"
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    "النصوص الأدبية", "النقد الأدبي", 
                    "القواعد النحوية", "الإملاء",
                    "الإنشاء", "التعبير"
                ] 
            },
            { 
                name: "التاريخ", 
                chapters: [
                    "التاريخ الإسلامي", "حضارات العالم", 
                    "الجزائر عبر التاريخ", "العصر الوسيط"
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    "English Basics", "Reading", "Writing"
                ] 
            }
        ]
    },

    // ==================== 2AS - Year 2 ====================
    {
        year: "2as",
        name: "2AS Sciences Expérimentales (سنة ثانية علوم تجريبية)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    "الدوال والاشتقاقية", "كثيرات الحدود", 
                    "المرجح", "الزوايا الموجهة", 
                    "المتتاليات", "الاحتمالات",
                    "المعادلات والمتراجحات", "التفاضل"
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    "العمل والطاقة الحركية", "الطاقة الكامنة", 
                    "الغاز المثالي", "المعايرة الكيميائية", 
                    "الناقلية الكهربائية", "الكيمياء العضوية",
                    "التفاعلات الكيميائية", "الحركة"
                ] 
            },
            { 
                name: "علوم الطبيعة والحياة", 
                chapters: [
                    "النمو والتجديد الخلوي", "التنسيق الهرموني", 
                    "الانقسام والالقاح", "بنية الخلية", 
                    "الطفرات الوراثية", "الوراثة",
                    "التنفس", "التغذية"
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    "العصر العباسي", "النقد الأدبي القديم", 
                    "الأدب الأندلسي", "الموشحات", 
                    "الشعر في العصر الحديث", "القصة",
                    "المقال"
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                chapters: [
                    "السيرة النبوية", "الفتوحات الإسلامية", 
                    "الحضارة الإسلامية", "التوحيد",
                    "العبادات", "الأخلاق"
                ] 
            }
        ]
    },
    {
        year: "2as",
        name: "2AS Math (سنة ثانية رياضيات)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    "الدوال", "الاشتقاقية", 
                    "المتتاليات", "المتراجحات", 
                    "الزوايا الموجهة", "المعادلات",
                    "الهندسة", "الإحصاء"
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    "الميكانيك", "الكهرباء", 
                    "الضوء", "الصوت",
                    "الحرارة", "الذرة"
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    "النصوص", "القواعد", 
                    "الإنشاء", "الإملاء"
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    "Grammar", "Vocabulary", "Reading"
                ] 
            },
            { 
                name: "التاريخ والجغرافيا", 
                chapters: [
                    "التاريخ العام", "الجغرافيا"
                ] 
            }
        ]
    },
    {
        year: "2as",
        name: "2AS Lettres et Philosophie (سنة ثانية آداب وفلسفة)",
        subjects: [
            { 
                name: "اللغة العربية", 
                chapters: [
                    "العصر العباسي الثاني", "النقد الأدبي القديم", 
                    "الأدب الأندلسي", "الموشحات", 
                    "الشعر في العصر الحديث", "القصة القصيرة",
                    "المقال الأدبي"
                ] 
            },
            { 
                name: "الفلسفة", 
                chapters: [
                    "مدخل إلى الفلسفة", "المنطق الصوري", 
                    "المذاهب الفلسفية", "الفلسفة اليونانية",
                    "فلسفة العصر الحديث"
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    "Make Peace", "Science and Tech", 
                    "Waste not, Want not", "Environment"
                ] 
            },
            { 
                name: "التاريخ والجغرافيا", 
                chapters: [
                    "أوضاع الجزائر في العهد العثماني", "النهضة الأوروبية", 
                    "الاستعمار الحديث", "القارة الأفريقية",
                    "العالم الإسلامي"
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                chapters: [
                    "التوحيد", "العبادات", 
                    "السيرة", "الأخلاق"
                ] 
            }
        ]
    },
    {
        year: "2as",
        name: "2AS Sciences Islamiques (سنة ثانية علوم إسلامية)",
        subjects: [
            { 
                name: "العلوم الإسلامية", 
                chapters: [
                    "القرآن الكريم", "الحديث النبوي", 
                    "الفقه", "أصول الفقه",
                    "العقيدة", "الاخلاق",
                    "التاريخ الإسلامي"
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    "النصوص القرآنية", "النصوص الحديثية", 
                    "النحو", "الصرف",
                    "البلاغة", "الإملاء"
                ] 
            },
            { 
                name: "التاريخ", 
                chapters: [
                    "التاريخ الإسلامي", "حضارات العالم",
                    "الجزائر"
                ] 
            },
            { 
                name: "الفلسفة", 
                chapters: [
                    "مقدمة في الفلسفة", "المنطق"
                ] 
            }
        ]
    },

    // ==================== L1 - University Year 1 ====================
    {
        year: "l1",
        name: "L1 Informatique (سنة أولى إعلام آلي)",
        subjects: [
            { 
                name: "Analyse 1", 
                chapters: [
                    "Logique mathématique", "Les ensembles", 
                    "Les nombres réels", "Les suites réelles", 
                    "Fonctions réelles", "Limites et continuité",
                    "Dérivabilité", "Théorème des valeurs intermédiaires"
                ] 
            },
            { 
                name: "Algèbre 1", 
                chapters: [
                    "Logique et Raisonnements", "Espaces vectoriels", 
                    "Applications linéaires", "Matrices",
                    "Déterminants", "Systèmes d'équations linéaires",
                    "Réduction des endomorphismes"
                ] 
            },
            { 
                name: "Algorithmique 1", 
                chapters: [
                    "Introduction à l'algorithmique", "Les types de données", 
                    "Les structures de contrôle", "Les tableaux",
                    "Les procédures et fonctions", "La récursivité",
                    "Complexité algorithmique"
                ] 
            },
            { 
                name: "Structure Machine 1", 
                chapters: [
                    "Systèmes de numération", "Algèbre de Boole", 
                    "Circuits combinatoires", "Circuits séquentiels",
                    "Mémoires", "Architecture de base"
                ] 
            },
            { 
                name: "Introduction à l'Informatique", 
                chapters: [
                    "Histoire de l'informatique", "Matériel et logiciel",
                    "Systèmes d'exploitation", "Réseaux",
                    "Bases de données", "Sécurité informatique"
                ] 
            },
            { 
                name: "Anglais Technique", 
                chapters: [
                    "Technical Vocabulary", "Reading Technical Texts",
                    "Writing Technical Reports", "Oral Communication"
                ] 
            }
        ]
    },
    {
        year: "l1",
        name: "L1 Sciences Exactes (سنة أولى علوم دقيقة)",
        subjects: [
            { 
                name: "Analyse 1", 
                chapters: [
                    "Suites numériques", "Limites", 
                    "Continuité", "Dérivation",
                    "Intégration", "Formules de Taylor"
                ] 
            },
            { 
                name: "Algèbre 1", 
                chapters: [
                    "Espaces vectoriels", "Applications linéaires", 
                    "Matrices", "Déterminants",
                    "Réduction"
                ] 
            },
            { 
                name: "Physique 1", 
                chapters: [
                    "Mécanique du point", "Optique géométrique",
                    "Thermodynamique", "Électricité"
                ] 
            },
            { 
                name: "Chimie 1", 
                chapters: [
                    "Structure atomique", "Liaisons chimiques",
                    "Réactions chimiques", "Stœchiométrie"
                ] 
            },
            { 
                name: "Anglais", 
                chapters: [
                    "Scientific English", "Vocabulary"
                ] 
            }
        ]
    },

    // ==================== L2 - University Year 2 ====================
    {
        year: "l2",
        name: "L2 Informatique (سنة ثانية إعلام آلي)",
        subjects: [
            { 
                name: "Analyse 2", 
                chapters: [
                    "Limites et continuité", "Dérivabilité", 
                    "Intégration", "Équations différentielles",
                    "Fonctions de plusieurs variables", "Séries numériques"
                ] 
            },
            { 
                name: "Algèbre 2", 
                chapters: [
                    "Réduction des endomorphismes", "Produits scalaires", 
                    "Formes quadratiques", "Espaces Euclidiens",
                    "Diagonalisation"
                ] 
            },
            { 
                name: "Algorithmique 2", 
                chapters: [
                    "Récursivité", "Listes chaînées", 
                    "Piles et files", "Arbres",
                    "Graphes", "Complexité avancée",
                    "Tri et recherche", "Algorithmique du texte"
                ] 
            },
            { 
                name: "Base de Données 1", 
                chapters: [
                    "Modèle relationnel", "Langage SQL",
                    "Normalisation", "Algèbre relationnelle",
                    "Conception de bases de données", "Transactions",
                    "Sécurité des bases de données"
                ] 
            },
            { 
                name: "Systèmes d'Exploitation", 
                chapters: [
                    "Processus", "Ordonnancement", 
                    "Mémoire", "Gestion de fichiers",
                    "Entrées/Sorties", "Synchronisation",
                    "Introduction à Linux"
                ] 
            },
            { 
                name: "Réseaux Informatiques", 
                chapters: [
                    "Modèles OSI et TCP/IP", "Adressage IP",
                    "Routage", "Protocoles",
                    "Réseaux locaux", "Sécurité réseau"
                ] 
            },
            { 
                name: "Programmation Avancée", 
                chapters: [
                    "POO", "Design Patterns",
                    "Gestion des exceptions", "Fichiers"
                ] 
            }
        ]
    },
    {
        year: "l2",
        name: "L2 Sciences Exactes (سنة ثانية علوم دقيقة)",
        subjects: [
            { 
                name: "Analyse 3", 
                chapters: [
                    "Séries numériques", "Séries entières",
                    "Fonctions de plusieurs variables", "Intégrales multiples"
                ] 
            },
            { 
                name: "Algèbre 3", 
                chapters: [
                    "Groupes", "Anneaux",
                    "Corps", "Arithmétique"
                ] 
            },
            { 
                name: "Physique 2", 
                chapters: [
                    "Mécanique analytique", "Électromagnétisme",
                    "Optique ondulatoire", "Physique quantique"
                ] 
            },
            { 
                name: "Chimie 2", 
                chapters: [
                    "Cinétique chimique", "Équilibre chimique",
                    "Chimie organique", "Thermochimie"
                ] 
            }
        ]
    },

    // ==================== L3 - University Year 3 ====================
    {
        year: "l3",
        name: "L3 Informatique (سنة ثالثة إعلام آلي)",
        subjects: [
            { 
                name: "Programmation Web", 
                chapters: [
                    "HTML/CSS", "JavaScript",
                    "PHP/MySQL", "Frameworks",
                    "API REST", "Sécurité web"
                ] 
            },
            { 
                name: "Base de Données Avancées", 
                chapters: [
                    "SQL Avancé", "NoSQL",
                    "Big Data", "Data Warehouse",
                    "Data Mining", "Optimisation"
                ] 
            },
            { 
                name: "Intelligence Artificielle", 
                chapters: [
                    "Introduction à l'IA", "Apprentissage automatique",
                    "Réseaux de neurones", "Traitement du langage naturel",
                    "Vision par ordinateur", "Systèmes experts"
                ] 
            },
            { 
                name: " Génie Logiciel", 
                chapters: [
                    "Analyse et conception", "Modélisation",
                    "Tests", "Gestion de projet",
                    "UML", "Méthodologies Agiles"
                ] 
            },
            { 
                name: "Sécurité Informatique", 
                chapters: [
                    "Cryptographie", "Authentification",
                    "Pare-feu", "Malwares",
                    "Sécurité réseau", "Audit"
                ] 
            },
            { 
                name: "Systèmes Distribués", 
                chapters: [
                    "Architectures distribuées", "RPC",
                    "Objets distribués", "Cloud Computing",
                    "Microservices", "Containerisation"
                ] 
            }
        ]
    },
    {
        year: "l3",
        name: "L3 Mathématiques (سنة ثالثة رياضيات)",
        subjects: [
            { 
                name: "Analyse Fonctionnelle", 
                chapters: [
                    "Espaces de Banach", "Espaces de Hilbert",
                    "Opérateurs linéaires", "Théorie spectrale"
                ] 
            },
            { 
                name: "Probabilités", 
                chapters: [
                    "Espaces probabilisés", "Variables aléatoires",
                    "Convergence", "Théorèmes limites",
                    "Martingales", "Processus stochastiques"
                ] 
            },
            { 
                name: "Statistiques", 
                chapters: [
                    "Estimation", "Tests d'hypothèses",
                    "Régression", "Analyse de variance",
                    "Statistiques bayésiennes"
                ] 
            },
            { 
                name: "Topologie", 
                chapters: [
                    "Espaces topologiques", "Continuité",
                    "Compacité", "Connexité",
                    "Complétude"
                ] 
            }
        ]
    }
];
