const TEMPLATES = [
    // ==================== BAC ====================
    {
        year: "bac",
        name: "BAC Sciences Expérimentales (شعبة العلوم التجريبية)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    { name: "الدوال العددية والنهايات", url: "" },
                    { name: "الدوال الأسية واللوغاريتمية", url: "" },
                    { name: "المتتاليات العددية", url: "" },
                    { name: "الاحتمالات", url: "" },
                    { name: "الهندسة في الفضاء", url: "" },
                    { name: "الأعداد المركبة", url: "" },
                    { name: "الحساب التكاملي", url: "" },
                    { name: "المعادلات التفاضلية", url: "" }
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    { name: "المتابعة الزمنية لتدفق كيميائي", url: "" },
                    { name: "التحولات النووية", url: "" },
                    { name: "الظواهر الكهربائية", url: "" },
                    { name: "حالة التوازن الكيميائي", url: "" },
                    { name: "الميكانيك", url: "" },
                    { name: "الأسترة", url: "" },
                    { name: "الاهتزازات الميكانيكية", url: "" },
                    { name: "الكهرومغناطيسية", url: "" }
                ] 
            },
            { 
                name: "علوم الطبيعة والحياة", 
                chapters: [
                    { name: "تركيب البروتين", url: "" },
                    { name: "بنية البروتين ووظيفته", url: "" },
                    { name: "النشاط الأنزيمي", url: "" },
                    { name: "المناعة", url: "" },
                    { name: "الاتصال العصبي", url: "" },
                    { name: "التكاثر", url: "" },
                    { name: "التركيب الضوئي والتنفس", url: "" },
                    { name: "التكتونية والجيولوجيا", url: "" },
                    { name: "الوراثة", url: "" }
                ] 
            },
            { 
                name: "الفلسفة", 
                has_exercises: false,
                chapters: [
                    { name: "المشكلة والإشكالية", url: "" },
                    { name: "الإدراك والاحساس", url: "" },
                    { name: "الذاكرة والخيال", url: "" },
                    { name: "اللغة والفكر", url: "" },
                    { name: "الشعور واللاشعور", url: "" },
                    { name: "المادة الحية والمادة الجامدة", url: "" },
                    { name: "الحقيقة", url: "" },
                    { name: "العدالة", url: "" },
                    { name: "الأخلاق", url: "" }
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    { name: "الأدب في عصر الضعف", url: "" },
                    { name: "مدرسة الإحياء والبعث", url: "" },
                    { name: "أدب المهجر والالتزام", url: "" },
                    { name: "الشعر التعليمي", url: "" },
                    { name: "فن المقال", url: "" },
                    { name: "القصة والرواية", url: "" },
                    { name: "النقد الأدبي", url: "" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "العقيدة الاسلامية و اثرها على الفرد و المجتمع", resources: [{ type: "video", url: "https://youtu.be/mFi5lHJwtF0?si=9elCFRXFXwWb5bCj", label: "فيديو الدرس" }] },
                    { name: "الدرس الثاني", resources: [{ type: "video", url: "https://youtu.be/LckJvHpIT1E?si=iTPmaUQALSiLDnGB", label: "فيديو الدرس" }] },
                    { name: "الدرس3: الإسلام والرسالات السماوية", resources: [{ type: "video", url: "https://youtu.be/dnIWslER0ug?si=zKS2_oJmnwbRYExH", label: "فيديو الدرس" }] },
                    { name: "الدرس4: العقل في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/PzHHZnvulFM?si=TdC6oSzeKYOd_LfY", label: "فيديو الدرس" }] },
                    { name: "الدرس5: مقاصد الشريعة الإسلامية", resources: [{ type: "video", url: "https://youtu.be/J2UAaOks53U?si=cpnYWEy6FbinbJfE", label: "فيديو الدرس" }] },
                    { name: "الدرس6: منهج الإسلام في محاربة الإنحراف والجريمة", resources: [{ type: "video", url: "https://youtu.be/47GwIqlKLnA?si=bpagrnyw294KN2tJ", label: "فيديو الدرس" }] },
                    { name: "الدرس7: المساواة أمام أحكام الشريعة الإسلامية في العقوبات", resources: [{ type: "video", url: "https://youtu.be/l_TgizsPZ5s?si=ZOZLalgWfwspveat", label: "فيديو الدرس" }] },
                    { name: "الدرس8: الصحة النفسية والجسمية في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/SDMvppi4SnA?si=Ou2jKMTTpbYryJFH", label: "فيديو الدرس" }] },
                    { name: "الدرس9: من مصادر التشريع الإسلامي (الإجماع/القياس/المصلحة المرسلة)", resources: [{ type: "video", url: "https://youtu.be/Ox4St2jDT7w?si=a8glL2mGM31cagKa", label: "فيديو الدرس" }] },
                    { name: "الدرس10: القيم في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/4tDYVaFhsqw?si=SzLGB0YZ8NzXWg-v", label: "فيديو الدرس" }] },
                    { name: "الدرس11", resources: [{ type: "video", url: "https://youtu.be/eVSuCjkxVZs?si=2578bqeInCgsgjX4", label: "فيديو الدرس" }] },
                    { name: "الدرس12", resources: [{ type: "video", url: "https://youtu.be/2LaLJl6HEL8?si=bAvQUSDXra7RiFGl", label: "فيديو الدرس" }] },
                    { name: "الدرس13", resources: [{ type: "video", url: "https://youtu.be/5sx1ake43wo?si=jts1QcLcuD3KRYYy", label: "فيديو الدرس" }] },
                    { name: "الدرس15: الحرية الشخصية و مدى ارتباطها بحقوق الآخرين", resources: [{ type: "video", url: "https://youtu.be/6U76b7PKN0I?si=x_JmOcPbmb42J873", label: "فيديو الدرس" }] }
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
                    { name: "الأعداد والحساب", url: "" },
                    { name: "الدوال والاشتقاقية", url: "" },
                    { name: "المتتاليات", url: "" },
                    { name: "الأعداد المركبة", url: "" },
                    { name: "الحساب التكاملي", url: "" },
                    { name: "الاحتمالات", url: "" },
                    { name: "القواسم والمضاعفات", url: "" },
                    { name: "المعادلات التفاضلية", url: "" },
                    { name: "الهندسة التحليلية", url: "" },
                    { name: "المصفوفات", url: "" }
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    { name: "المتابعة الزمنية", url: "" },
                    { name: "التحولات النووية", url: "" },
                    { name: "الكهرباء", url: "" },
                    { name: "الميكانيك والنيوتن", url: "" },
                    { name: "الاهتزازات الميكانيكية", url: "" },
                    { name: "كيمياء توازن", url: "" },
                    { name: "الفيزياء النووية", url: "" },
                    { name: "الليزر", url: "" },
                    { name: "الأمواج", url: "" }
                ] 
            },
            { 
                name: "الهندسة التقنية", 
                chapters: [
                    { name: "الآليات والمنطق", url: "" },
                    { name: "مقاومة المواد", url: "" },
                    { name: "دراسة الأنظمة", url: "" },
                    { name: "الإنشاء الميكانيكي", url: "" },
                    { name: "الإنشاء المدني", url: "" },
                    { name: "التحكم الآلي", url: "" },
                    { name: "البرمجة", url: "" },
                    { name: "الدوائر الإلكترونية", url: "" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "العقيدة الاسلامية و اثرها على الفرد و المجتمع", resources: [{ type: "video", url: "https://youtu.be/mFi5lHJwtF0?si=9elCFRXFXwWb5bCj", label: "فيديو الدرس" }] },
                    { name: "الدرس الثاني", resources: [{ type: "video", url: "https://youtu.be/LckJvHpIT1E?si=iTPmaUQALSiLDnGB", label: "فيديو الدرس" }] },
                    { name: "الدرس3: الإسلام والرسالات السماوية", resources: [{ type: "video", url: "https://youtu.be/dnIWslER0ug?si=zKS2_oJmnwbRYExH", label: "فيديو الدرس" }] },
                    { name: "الدرس4: العقل في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/PzHHZnvulFM?si=TdC6oSzeKYOd_LfY", label: "فيديو الدرس" }] },
                    { name: "الدرس5: مقاصد الشريعة الإسلامية", resources: [{ type: "video", url: "https://youtu.be/J2UAaOks53U?si=cpnYWEy6FbinbJfE", label: "فيديو الدرس" }] },
                    { name: "الدرس6: منهج الإسلام في محاربة الإنحراف والجريمة", resources: [{ type: "video", url: "https://youtu.be/47GwIqlKLnA?si=bpagrnyw294KN2tJ", label: "فيديو الدرس" }] },
                    { name: "الدرس7: المساواة أمام أحكام الشريعة الإسلامية في العقوبات", resources: [{ type: "video", url: "https://youtu.be/l_TgizsPZ5s?si=ZOZLalgWfwspveat", label: "فيديو الدرس" }] },
                    { name: "الدرس8: الصحة النفسية والجسمية في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/SDMvppi4SnA?si=Ou2jKMTTpbYryJFH", label: "فيديو الدرس" }] },
                    { name: "الدرس9: من مصادر التشريع الإسلامي (الإجماع/القياس/المصلحة المرسلة)", resources: [{ type: "video", url: "https://youtu.be/Ox4St2jDT7w?si=a8glL2mGM31cagKa", label: "فيديو الدرس" }] },
                    { name: "الدرس10: القيم في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/4tDYVaFhsqw?si=SzLGB0YZ8NzXWg-v", label: "فيديو الدرس" }] },
                    { name: "الدرس11", resources: [{ type: "video", url: "https://youtu.be/eVSuCjkxVZs?si=2578bqeInCgsgjX4", label: "فيديو الدرس" }] },
                    { name: "الدرس12", resources: [{ type: "video", url: "https://youtu.be/2LaLJl6HEL8?si=bAvQUSDXra7RiFGl", label: "فيديو الدرس" }] },
                    { name: "الدرس13", resources: [{ type: "video", url: "https://youtu.be/5sx1ake43wo?si=jts1QcLcuD3KRYYy", label: "فيديو الدرس" }] },
                    { name: "الدرس15: الحرية الشخصية و مدى ارتباطها بحقوق الآخرين", resources: [{ type: "video", url: "https://youtu.be/6U76b7PKN0I?si=x_JmOcPbmb42J873", label: "فيديو الدرس" }] }
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    { name: "Grammar", url: "" },
                    { name: "Vocabulary", url: "" },
                    { name: "Reading Comprehension", url: "" },
                    { name: "Writing", url: "" },
                    { name: "Technical English", url: "" }
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
                    { name: "الاهتلاكات والمخزونات", url: "" },
                    { name: "إعداد الميزانية والنتائج", url: "" },
                    { name: "محاسبة التكاليف الكلية", url: "" },
                    { name: "محاسبة التكاليف المتغيرة", url: "" },
                    { name: "تحليل الميزانية", url: "" },
                    { name: "التدفق المالي", url: "" },
                    { name: "القرار المالي", url: "" },
                    { name: "الاستثمار", url: "" }
                ] 
            },
            { 
                name: "الاقتصاد والمناجمت", 
                chapters: [
                    { name: "النقود والأسعار", url: "" },
                    { name: "النظام المصرفي", url: "" },
                    { name: "التجارة الخارجية", url: "" },
                    { name: "البطالة والتضخم", url: "" },
                    { name: "القيادة والرقابة", url: "" },
                    { name: "الاقتصاد الدولي", url: "" },
                    { name: "النمو الاقتصادي", url: "" },
                    { name: "التنمية", url: "" }
                ] 
            },
            { 
                name: "قانون", 
                chapters: [
                    { name: "عقد البيع", url: "" },
                    { name: "شركة المساهمة", url: "" },
                    { name: "عقد العمل", url: "" },
                    { name: "الضريبة على الدخل", url: "" },
                    { name: "الملكية الفكرية", url: "" },
                    { name: "القانون التجاري", url: "" },
                    { name: "النظام القانوني للمقاولات", url: "" }
                ] 
            },
            { 
                name: "الرياضيات (تسيير)", 
                chapters: [
                    { name: "المتتاليات", url: "" },
                    { name: "الدوال العددية", url: "" },
                    { name: "الإحصاء والاحتمالات", url: "" },
                    { name: "الرياضيات المالية", url: "" },
                    { name: "النمذجة الرياضية", url: "" },
                    { name: "المعادلات", url: "" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "العقيدة الاسلامية و اثرها على الفرد و المجتمع", resources: [{ type: "video", url: "https://youtu.be/mFi5lHJwtF0?si=9elCFRXFXwWb5bCj", label: "فيديو الدرس" }] },
                    { name: "الدرس الثاني", resources: [{ type: "video", url: "https://youtu.be/LckJvHpIT1E?si=iTPmaUQALSiLDnGB", label: "فيديو الدرس" }] },
                    { name: "الدرس3: الإسلام والرسالات السماوية", resources: [{ type: "video", url: "https://youtu.be/dnIWslER0ug?si=zKS2_oJmnwbRYExH", label: "فيديو الدرس" }] },
                    { name: "الدرس4: العقل في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/PzHHZnvulFM?si=TdC6oSzeKYOd_LfY", label: "فيديو الدرس" }] },
                    { name: "الدرس5: مقاصد الشريعة الإسلامية", resources: [{ type: "video", url: "https://youtu.be/J2UAaOks53U?si=cpnYWEy6FbinbJfE", label: "فيديو الدرس" }] },
                    { name: "الدرس6: منهج الإسلام في محاربة الإنحراف والجريمة", resources: [{ type: "video", url: "https://youtu.be/47GwIqlKLnA?si=bpagrnyw294KN2tJ", label: "فيديو الدرس" }] },
                    { name: "الدرس7: المساواة أمام أحكام الشريعة الإسلامية في العقوبات", resources: [{ type: "video", url: "https://youtu.be/l_TgizsPZ5s?si=ZOZLalgWfwspveat", label: "فيديو الدرس" }] },
                    { name: "الدرس8: الصحة النفسية والجسمية في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/SDMvppi4SnA?si=Ou2jKMTTpbYryJFH", label: "فيديو الدرس" }] },
                    { name: "الدرس9: من مصادر التشريع الإسلامي (الإجماع/القياس/المصلحة المرسلة)", resources: [{ type: "video", url: "https://youtu.be/Ox4St2jDT7w?si=a8glL2mGM31cagKa", label: "فيديو الدرس" }] },
                    { name: "الدرس10: القيم في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/4tDYVaFhsqw?si=SzLGB0YZ8NzXWg-v", label: "فيديو الدرس" }] },
                    { name: "الدرس11", resources: [{ type: "video", url: "https://youtu.be/eVSuCjkxVZs?si=2578bqeInCgsgjX4", label: "فيديو الدرس" }] },
                    { name: "الدرس12", resources: [{ type: "video", url: "https://youtu.be/2LaLJl6HEL8?si=bAvQUSDXra7RiFGl", label: "فيديو الدرس" }] },
                    { name: "الدرس13", resources: [{ type: "video", url: "https://youtu.be/5sx1ake43wo?si=jts1QcLcuD3KRYYy", label: "فيديو الدرس" }] },
                    { name: "الدرس15: الحرية الشخصية و مدى ارتباطها بحقوق الآخرين", resources: [{ type: "video", url: "https://youtu.be/6U76b7PKN0I?si=x_JmOcPbmb42J873", label: "فيديو الدرس" }] }
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    { name: "Business English", url: "" },
                    { name: "Communication", url: "" },
                    { name: "Marketing", url: "" },
                    { name: "Management", url: "" }
                ] 
            }
        ]
    },
    {
        year: "bac",
        name: "BAC Lettres et Philosophie (شعبة الأدب والفلسفة)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    { name: "المتتاليات", url: "https://youtu.be/Vtl2Xk0IsXw?si=-D6hD4PFlUMUTU6C" },
                    { name: "الموافقات و القسمة الاقليدية", url: "https://youtu.be/xsVrrTX3JWc?si=YK6gidCOq2YhxI6j" },
                    { name: "الدوال", url: "https://www.youtube.com/live/3h5aPEb9mtg?si=IYF1nanbou5fk8hW" }
                ] 
            },
            { 
                name: "اللغة العربية", 
                has_exercises: false,
                chapters: [
                ] 
            },
            { 
                name: "التاريخ والجغرافيا", 
                has_exercises: false,
                chapters: [
                    { name: "بروز الصراع و تشكل العالم", url: "https://youtu.be/xLNEKURH6h8?si=vrY_BPztVy_phJ35" },
                    { name: "التعايش السلمي", url: "https://youtu.be/raE5rpA2QOI?si=2r8-sFL1xbT5_HlX" },
                    { name: "مساعي الانفراج الدولي", url: "https://youtu.be/cMyuv-YuWs0?si=-40FO6H1Y8QWrv4n" },
                    { name: "الثروة الجزائرية", url: "https://youtu.be/CSIKQCsohNw?si=ghLyO4xHnCXyUUhR" }
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                has_exercises: false,
                chapters: [
                    { name: "it's high time", url: "https://youtu.be/CebUP7opVdw?si=1oCP8HtdLfAmUs-2" },
                    { name: "so...that/such...that", url: "https://youtu.be/WgWcZ3AwRSc?si=6M-McTdjNsVHbgm4" },
                    { name: "how to ask a question كيف اسئل سؤالا", url: "https://youtu.be/0ZYGiuKC1ko?si=Jp0h78j11KKJDHUW" },
                    { name: "كيفية كتابة فقرة", url: "https://youtu.be/UgEDNxxZVbw?si=WJICxNdLoe-_bfHa" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "العقيدة الاسلامية و اثرها على الفرد و المجتمع", resources: [{ type: "video", url: "https://youtu.be/mFi5lHJwtF0?si=9elCFRXFXwWb5bCj", label: "فيديو الدرس" }] },
                    { name: "الدرس الثاني", resources: [{ type: "video", url: "https://youtu.be/LckJvHpIT1E?si=iTPmaUQALSiLDnGB", label: "فيديو الدرس" }] },
                    { name: "الدرس3: الإسلام والرسالات السماوية", resources: [{ type: "video", url: "https://youtu.be/dnIWslER0ug?si=zKS2_oJmnwbRYExH", label: "فيديو الدرس" }] },
                    { name: "الدرس4: العقل في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/PzHHZnvulFM?si=TdC6oSzeKYOd_LfY", label: "فيديو الدرس" }] },
                    { name: "الدرس5: مقاصد الشريعة الإسلامية", resources: [{ type: "video", url: "https://youtu.be/J2UAaOks53U?si=cpnYWEy6FbinbJfE", label: "فيديو الدرس" }] },
                    { name: "الدرس6: منهج الإسلام في محاربة الإنحراف والجريمة", resources: [{ type: "video", url: "https://youtu.be/47GwIqlKLnA?si=bpagrnyw294KN2tJ", label: "فيديو الدرس" }] },
                    { name: "الدرس7: المساواة أمام أحكام الشريعة الإسلامية في العقوبات", resources: [{ type: "video", url: "https://youtu.be/l_TgizsPZ5s?si=ZOZLalgWfwspveat", label: "فيديو الدرس" }] },
                    { name: "الدرس8: الصحة النفسية والجسمية في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/SDMvppi4SnA?si=Ou2jKMTTpbYryJFH", label: "فيديو الدرس" }] },
                    { name: "الدرس9: من مصادر التشريع الإسلامي (الإجماع/القياس/المصلحة المرسلة)", resources: [{ type: "video", url: "https://youtu.be/Ox4St2jDT7w?si=a8glL2mGM31cagKa", label: "فيديو الدرس" }] },
                    { name: "الدرس10: القيم في القرآن الكريم", resources: [{ type: "video", url: "https://youtu.be/4tDYVaFhsqw?si=SzLGB0YZ8NzXWg-v", label: "فيديو الدرس" }] },
                    { name: "الدرس11", resources: [{ type: "video", url: "https://youtu.be/eVSuCjkxVZs?si=2578bqeInCgsgjX4", label: "فيديو الدرس" }] },
                    { name: "الدرس12", resources: [{ type: "video", url: "https://youtu.be/2LaLJl6HEL8?si=bAvQUSDXra7RiFGl", label: "فيديو الدرس" }] },
                    { name: "الدرس13", resources: [{ type: "video", url: "https://youtu.be/5sx1ake43wo?si=jts1QcLcuD3KRYYy", label: "فيديو الدرس" }] },
                    { name: "الدرس15: الحرية الشخصية و مدى ارتباطها بحقوق الآخرين", resources: [{ type: "video", url: "https://youtu.be/6U76b7PKN0I?si=x_JmOcPbmb42J873", label: "فيديو الدرس" }] }
                ] 
            },
            { 
                name: "Francais", 
                has_exercises: false,
                chapters: [
                    { name: "Le compte rendu", url: "https://youtu.be/uCNE7mmwVz0?si=Rhh8jqdbUqBnMejD" },
                    { name: "Le discours directc et indrect", url: "https://youtu.be/rTDnH8ndrPw?si=uBxUWjcb7lQHYV2g" },
                    { name: "la voix passive et active", url: "https://youtu.be/UrmKeoPjS9M?si=O0i-Evieei1WiHEO" },
                    { name: "La visee communicatie", url: "https://youtu.be/xeV2hGgMv5I?si=dge6bFe6ZS6LSosG" },
                    { name: "les types d'auteurs", url: "https://youtu.be/Zics2WkMOSg?si=l6hXq75ICbiDoY5a" }
                ] 
            }
        ]
    },
    // ==================== 2AS ====================
    {
        year: "2as",
        name: "2AS Sciences Expérimentales (سنة ثانية علوم تجريبية)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    { name: "الدوال والاشتقاقية", url: "" },
                    { name: "كثيرات الحدود", url: "" },
                    { name: "المرجح", url: "" },
                    { name: "الزوايا الموجهة", url: "" },
                    { name: "المتتاليات", url: "" },
                    { name: "الاحتمالات", url: "" },
                    { name: "المعادلات والمتراجحات", url: "" },
                    { name: "التفاضل", url: "" }
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    { name: "العمل والطاقة الحركية", url: "" },
                    { name: "الطاقة الكامنة", url: "" },
                    { name: "الغاز المثالي", url: "" },
                    { name: "المعايرة الكيميائية", url: "" },
                    { name: "الناقلية الكهربائية", url: "" },
                    { name: "الكيمياء العضوية", url: "" },
                    { name: "التفاعلات الكيميائية", url: "" },
                    { name: "الحركة", url: "" }
                ] 
            },
            { 
                name: "علوم الطبيعة والحياة", 
                chapters: [
                    { name: "النمو والتجديد الخلوي", url: "" },
                    { name: "التنسيق الهرموني", url: "" },
                    { name: "الانقسام والالقاح", url: "" },
                    { name: "بنية الخلية", url: "" },
                    { name: "الطفرات الوراثية", url: "" },
                    { name: "الوراثة", url: "" },
                    { name: "التنفس", url: "" },
                    { name: "التغذية", url: "" }
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    { name: "العصر العباسي", url: "" },
                    { name: "النقد الأدبي القديم", url: "" },
                    { name: "الأدب الأندلسي", url: "" },
                    { name: "الموشحات", url: "" },
                    { name: "الشعر في العصر الحديث", url: "" },
                    { name: "القصة", url: "" },
                    { name: "المقال", url: "" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "السيرة النبوية", url: "" },
                    { name: "الفتوحات الإسلامية", url: "" },
                    { name: "الحضارة الإسلامية", url: "" },
                    { name: "التوحيد", url: "" },
                    { name: "العبادات", url: "" },
                    { name: "الأخلاق", url: "" }
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
                    { name: "العصر العباسي الثاني", url: "" },
                    { name: "النقد الأدبي القديم", url: "" },
                    { name: "الأدب الأندلسي", url: "" },
                    { name: "الموشحات", url: "" },
                    { name: "الشعر في العصر الحديث", url: "" },
                    { name: "القصة القصيرة", url: "" },
                    { name: "المقال الأدبي", url: "" }
                ] 
            },
            { 
                name: "الفلسفة", 
                has_exercises: false,
                chapters: [
                    { name: "مدخل إلى الفلسفة", url: "" },
                    { name: "المنطق الصوري", url: "" },
                    { name: "المذاهب الفلسفية", url: "" },
                    { name: "الفلسفة اليونانية", url: "" },
                    { name: "فلسفة العصر الحديث", url: "" }
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    { name: "Science and Tech", url: "" },
                    { name: "Waste not, Want not", url: "" },
                    { name: "Environment", url: "" }
                ] 
            },
            { 
                name: "التاريخ والجغرافيا", 
                chapters: [
                    { name: "أوضاع الجزائر في العهد العثماني", url: "" },
                    { name: "النهضة الأوروبية", url: "" },
                    { name: "الاستعمار الحديث", url: "" },
                    { name: "القارة الأفريقية", url: "" },
                    { name: "العالم الإسلامي", url: "" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "التوحيد", url: "" },
                    { name: "العبادات", url: "" },
                    { name: "السيرة", url: "" },
                    { name: "الأخلاق", url: "" }
                ] 
            }
        ]
    },
    // ==================== L1 ====================
    {
        year: "l1",
        name: "L1 Informatique S1(سنة أولى إعلام آلي)",
        subjects: [
            { 
                name: "Analyse 1", 
                chapters: [
                    { name: "Logique mathématique", url: "" },
                    { name: "Les ensembles", url: "" },
                    { name: "Les nombres réels", url: "" },
                    { name: "Les suites réelles", url: "" }
                ] 
            },
            { 
                name: "Algèbre 1", 
                chapters: [
                    { name: "Logique et Raisonnements", url: "" },
                    { name: "Espaces vectoriels", url: "" },
                    { name: "Applications linéaires", url: "" },
                    { name: "Matrices", url: "" },
                    { name: "Déterminants", url: "" },
                    { name: "Systèmes d'équations linéaires", url: "" },
                    { name: "Réduction des endomorphismes", url: "" }
                ] 
            },
            { 
                name: "Algorithmique 1", 
                chapters: [
                    { name: "Introduction à l'algorithmique", url: "" },
                    { name: "Les types de données", url: "" },
                    { name: "Les structures de contrôle", url: "" },
                    { name: "Les tableaux", url: "" },
                    { name: "Les procédures et fonctions", url: "" },
                    { name: "La récursivité", url: "" },
                    { name: "Complexité algorithmique", url: "" }
                ] 
            },
            { 
                name: "Structure Machine 1", 
                chapters: [
                    { name: "Systèmes de numération", url: "" },
                    { name: "Algèbre de Boole", url: "" },
                    { name: "Circuits combinatoires", url: "" },
                    { name: "Circuits séquentiels", url: "" },
                    { name: "Mémoires", url: "" },
                    { name: "Architecture de base", url: "" }
                ] 
            }
        ]
    },
    {
        year: "l1",
        name: "L1 Informatique S2(سنة ثانية إعلام آلي)",
        subjects: [
            { 
                name: "Analyse 2", 
                chapters: [
                    { name: "Limites et continuité", url: "" },
                    { name: "Dérivabilité", url: "" },
                    { name: "Intégration", url: "" },
                    { name: "Équations différentielles", url: "" },
                    { name: "Fonctions de plusieurs variables", url: "" },
                    { name: "Séries numériques", url: "" }
                ] 
            },
            { 
                name: "Algèbre 2", 
                chapters: [
                    { name: "Réduction des endomorphismes", url: "" },
                    { name: "Produits scalaires", url: "" },
                    { name: "Formes quadratiques", url: "" },
                    { name: "Espaces Euclidiens", url: "" },
                    { name: "Diagonalisation", url: "" }
                ] 
            },
            { 
                name: "Algorithmique 2", 
                chapters: [
                    { name: "les structure", url: "" },
                    { name: "les fonction et procedure", url: "" },
                    { name: "les piles", url: "" }
                ] 
            }
        ]
    },
    // ==================== L2 ====================
    {
        year: "l2",
        name: "L2 Informatique S3 (الفصل الاول من السنة الثانية)",
        subjects: [
            { 
                name: "Architecture des ordinateurs", 
                chapters: [
                    { name: "Introduction", url: "" },
                    { name: "Logique combinatoire", url: "" },
                    { name: "Logique séquentielle", url: "" },
                    { name: "Le processeur", url: "" },
                    { name: "La mémoire", url: "" },
                    { name: "Entrées/Sorties", url: "" }
                ] 
            },
            { 
                name: "Algorithmique 3", 
                chapters: [
                    { name: "Complexité", url: "" },
                    { name: "Récursivité", url: "" },
                    { name: "Listes chaînées", url: "" },
                    { name: "Piles et Files", url: "" },
                    { name: "Arbres binaires", url: "" }
                ] 
            },
            { 
                name: "Systèmes d'information", 
                chapters: [
                    { name: "Introduction", url: "" },
                    { name: "Modèle conceptuel des données (MCD)", url: "" },
                    { name: "Modèle logique des données (MLD)", url: "" },
                    { name: "Normalisation", url: "" }
                ] 
            },
            { 
                name: "Théorie des graphes", 
                chapters: [
                    { name: "Généralités", url: "" },
                    { name: "Chemins et circuits", url: "" },
                    { name: "Arbres et arborescences", url: "" },
                    { name: "Problèmes de flot", url: "" }
                ] 
            },
            { 
                name: "Méthodes numériques", 
                chapters: [
                    { name: "Résolution d'équations non linéaires", url: "" },
                    { name: "Interpolation", url: "" },
                    { name: "Intégration numérique", url: "" },
                    { name: "Systèmes linéaires", url: "" }
                ] 
            },
            { 
                name: "Logique Mathématique", 
                chapters: [
                    { name: "Calcul des propositions", url: "" },
                    { name: "Calcul des prédicats", url: "" },
                    { name: "Systèmes formels", url: "" }
                ] 
            }
        ]
    },
    {
        year: "l2",
        name: "L2 Informatique S4 (الفصل الثاني من السنة الثانية)",
        subjects: [
            { 
                name: "Théorie des langages", 
                chapters: [
                    { name: "Alphabets et mots", url: "" },
                    { name: "Grammaires", url: "" },
                    { name: "Automates à états finis", url: "" },
                    { name: "Expressions régulières", url: "" }
                ] 
            },
            { 
                name: "Système d'exploitation 1", 
                chapters: [
                    { name: "Introduction", url: "" },
                    { name: "Gestion des processus", url: "" },
                    { name: "Ordonنancement", url: "" },
                    { name: "Gestion de la mémoire", url: "" }
                ] 
            },
            { 
                name: "Bases de données", 
                chapters: [
                    { name: "Introduction", url: "" },
                    { name: "Modèle relationnel", url: "" },
                    { name: "Algèbre relationnelle", url: "" },
                    { name: "Langage SQL", url: "" }
                ] 
            },
            { 
                name: "Réseaux", 
                chapters: [
                    { name: "Modèle OSI et TCP/IP", url: "" },
                    { name: "Couche physique", url: "" },
                    { name: "Couche liaison", url: "" },
                    { name: "Couche réseau", url: "" }
                ] 
            },
            { 
                name: "POO (Java/C++)", 
                chapters: [
                    { name: "Classes et objets", url: "" },
                    { name: "Héritage", url: "" },
                    { name: "Polymorphisme", url: "" },
                    { name: "Interfaces", url: "" },
                    { name: "Exceptions", url: "" }
                ] 
            },
            { 
                name: "Développement Web", 
                chapters: [
                    { name: "HTML5", url: "" },
                    { name: "CSS3", url: "" },
                    { name: "JavaScript", url: "" },
                    { name: "PHP / Backend Basics", url: "" }
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
                    { name: "Séries numériques", url: "" },
                    { name: "Séries entières", url: "" },
                    { name: "Fonctions de plusieurs variables", url: "" },
                    { name: "Intégrales multiples", url: "" }
                ] 
            },
            { 
                name: "Algèbre 3", 
                chapters: [
                    { name: "Groupes", url: "" },
                    { name: "Anneaux", url: "" },
                    { name: "Corps", url: "" },
                    { name: "Arithmétique", url: "" }
                ] 
            },
            { 
                name: "Physique 2", 
                chapters: [
                    { name: "Mécanique analytique", url: "" },
                    { name: "Électromagnétisme", url: "" },
                    { name: "Optique ondulatoire", url: "" },
                    { name: "Physique quantique", url: "" }
                ] 
            },
            { 
                name: "Chimie 2", 
                chapters: [
                    { name: "Cinétique chimique", url: "" },
                    { name: "Équilibre chimique", url: "" },
                    { name: "Chimie organique", url: "" },
                    { name: "Thermochimie", url: "" }
                ] 
            }
        ]
    },
    // ==================== L3 ====================
    {
        year: "l3",
        name: "L3 Mathématiques (سنة ثالثة رياضيات)",
        subjects: [
            { 
                name: "Analyse Fonctionnelle", 
                chapters: [
                    { name: "Espaces de Banach", url: "" },
                    { name: "Espaces de Hilbert", url: "" },
                    { name: "Opérateurs linéaires", url: "" },
                    { name: "Théorie spectrale", url: "" }
                ] 
            },
            { 
                name: "Probabilités", 
                chapters: [
                    { name: "Espaces probabilisés", url: "" },
                    { name: "Variables aléatoires", url: "" },
                    { name: "Convergence", url: "" },
                    { name: "Théorèmes limites", url: "" },
                    { name: "Martingales", url: "" },
                    { name: "Processus stochastiques", url: "" }
                ] 
            },
            { 
                name: "Statistiques", 
                chapters: [
                    { name: "Estimation", url: "" },
                    { name: "Tests d'hypothèses", url: "" },
                    { name: "Régression", url: "" },
                    { name: "Analyse de variance", url: "" },
                    { name: "Statistiques bayésiennes", url: "" }
                ] 
            },
            { 
                name: "Topologie", 
                chapters: [
                    { name: "Espaces topologiques", url: "" },
                    { name: "Continuité", url: "" },
                    { name: "Compacité", url: "" },
                    { name: "Connexité", url: "" },
                    { name: "Complétude", url: "" }
                ] 
            }
        ]
    }
];
