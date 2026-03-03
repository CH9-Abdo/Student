const TEMPLATES = [
    {
        year: "bac",
        name: "BAC (Sciences Expérimentales)",
        subjects: [
            { name: "الرياضيات", chapters: ["الدوال العددية", "الدوال الأسية واللوغاريتمية", "المتتاليات العددية", "الهندسة في الفضاء", "الأعداد المركبة", "الحساب التكاملي", "الاحتمالات"] },
            { name: "العلوم الفيزيائية", chapters: ["المتابعة الزمنية لتدفق كيميائي", "التحولات النووية", "الظواهر الكهربائية", "حالة التوازن الكيميائي", "الميكانيك", "الأسترة"] },
            { name: "علوم الطبيعة والحياة", chapters: ["تركيب البروتين", "بنية ووظيفة البروتين", "النشاط الأنزيمي", "المناعة", "الاتصال العصبي", "التركيب الضوئي والتنفس", "التكتونية والجيولوجيا"] },
            { name: "الفلسفة", chapters: ["المشكلة والإشكالية", "الإدراك والاحساس", "الذاكرة والخيال", "اللغة والفكر", "الشعور واللاشعور", "المادة الحية والمادة الجامدة", "الحقيقة"] },
            { name: "اللغة العربية", chapters: ["الأدب في عصر الضعف", "مدرسة الإحياء والبعث", "أدب المهجر والالتزام", "الشعر التعليمي", "فن المقال"] },
            { name: "العلوم الإسلامية", chapters: ["العقيدة الإسلامية", "الإسلام والرسالات", "العقل في القرآن", "الميراث", "المعاملات المالية"] }
        ]
    },
    {
        year: "bac",
        name: "BAC (Math / Technique Math)",
        subjects: [
            { name: "الرياضيات (متقدم)", chapters: ["الأعداد والحساب", "الدوال والاشتقاقية", "المتتاليات", "الأعداد المركبة", "الحساب التكاملي", "الاحتمالات", "القواسم والمضاعفات"] },
            { name: "العلوم الفيزيائية", chapters: ["المتابعة الزمنية", "التحولات النووية", "الكهرباء", "الميكانيك والنيوتن", "الاهتزازات الميكانيكية", "كيمياء توازن"] },
            { name: "تكنولوجيا (هندسة)", chapters: ["الآليات والمنطق", "مقاومة المواد", "دراسة الأنظمة", "الإنشاء الميكانيكي/المدني", "التحكم الآلي"] },
            { name: "الفلسفة", chapters: ["السؤال العلمي والفلسفي", "المشكلة والإشكالية", "الحقيقة", "الأخلاق"] }
        ]
    },
    {
        year: "bac",
        name: "BAC (Gestion et Economie)",
        subjects: [
            { name: "التسيير المحاسبي والمالي", chapters: ["الاهتلاكات والمخزونات", "إعداد الميزانية والنتائج", "محاسبة التكاليف الكلية", "محاسبة التكاليف المتغيرة", "تحليل الميزانية"] },
            { name: "اقتصاد ومناجمت", chapters: ["النقود والأسعار", "النظام المصرفي", "التجارة الخارجية", "البطالة والتضخم", "القيادة والرقابة"] },
            { name: "قانون", chapters: ["عقد البيع", "شركة المساهمة", "عقد العمل", "الضريبة على الدخل"] },
            { name: "الرياضيات (تسيير)", chapters: ["المتتاليات", "الدوال العددية", "الإحصاء والاحتمالات"] }
        ]
    },
    {
        year: "bac",
        name: "BAC (Lettres et Philosophie)",
        subjects: [
            { name: "الفلسفة", chapters: ["الإدراك والإحساس", "الذاكرة والخيال", "اللغة والفكر", "الشعور واللاشعور", "الأسرة والمجتمع", "الحقيقة والعدالة", "الأخلاق البيولوجية"] },
            { name: "اللغة العربية", chapters: ["عصر الضعف", "عصر النهضة", "أدب المهجر", "الالتزام في الأدب العربي", "فن المقال والقصة"] },
            { name: "التاريخ والجغرافيا", chapters: ["الحرب الباردة", "الثورة الجزائرية", "استعادة السيادة", "القوى الاقتصادية الكبرى", "دول الجنوب"] }
        ]
    },
    {
        year: "2as",
        name: "2AS (Sciences Expérimentales)",
        subjects: [
            { name: "الرياضيات (2 ثانوي)", chapters: ["الدوال والاشتقاقية", "كثيرات الحدود", "المرجح", "الزوايا الموجهة", "المتتاليات", "الاحتمالات"] },
            { name: "العلوم الفيزيائية", chapters: ["العمل والطاقة الحركية", "الطاقة الكامنة", "الغاز المثالي", "المعايرة الكيميائية", "الناقلية الكهربائية", "الكيمياء العضوية"] },
            { name: "علوم الطبيعة والحياة", chapters: ["النمو والتجديد الخلوي", "التنسيق الهرموني", "الانقسام والالقاح", "بنية الخلية", "الطفرات الوراثية"] }
        ]
    },
    {
        year: "2as",
        name: "2AS (Lettres et Philosophie)",
        subjects: [
            { name: "اللغة العربية", chapters: ["العصر العباسي الثاني", "النقد الأدبي القديم", "الأدب الأندلسي", "الموشحات", "الشعر في العصر الحديث"] },
            { name: "الفلسفة (بداية)", chapters: ["مدخل إلى الفلسفة", "المنطق الصوري", "المذاهب الفلسفية", "الفلسفة اليونانية"] },
            { name: "اللغة الإنجليزية", chapters: ["Make Peace", "Science and Tech", "Waste not, Want not"] },
            { name: "التاريخ والجغرافيا", chapters: ["أوضاع الجزائر في العهد العثماني", "النهضة الأوروبية", "الاستعمار الحديث", "القارة الأفريقية"] }
        ]
    },
    {
        year: "l1",
        name: "Semester 1 (Informatique - L1)",
        subjects: [
            { name: "Analyse 1", chapters: ["Logique mathématique", "Les ensembles", "Les nombres réels", "Les suites réelles", "Fonctions réelles"] },
            { name: "Algèbre 1", chapters: ["Logique et Raisonnements", "Espaces vectoriels", "Applications linéaires", "Matrices"] },
            { name: "Algorithmique 1", chapters: ["Introduction", "Les types", "Structures de contrôle", "Tableaux"] },
            { name: "Structure Machine 1", chapters: ["Numération", "Algèbre de Boole", "Circuits combinatoires"] }
        ]
    },
    {
        year: "l2",
        name: "Semester 1 (Informatique - L2)",
        subjects: [
            { name: "Analyse 2", chapters: ["Limites et continuité", "Dérivabilité", "Intégration", "Équations différentielles"] },
            { name: "Algèbre 2", chapters: ["Réduction des endomorphismes", "Produits scalaires", "Formes quadratiques"] },
            { name: "Algorithmique 2", chapters: ["Récursivité", "Listes chaînées", "Arbres", "Complexité"] },
            { name: "Base de Données 1", chapters: ["Modèle relationnel", "SQL", "Normalisation", "Algèbre relationnelle"] },
            { name: "Systèmes d'Exploitation", chapters: ["Processus", "Mémoire", "Fichiers", "Scheduling"] }
        ]
    }
];
