const TEMPLATES = [
    // ==================== BAC ====================
    {
        year: "bac",
        name: "BAC Sciences Expérimentales (شعبة العلوم التجريبية)",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    { name: "الدوال العددية والنهايات" },
                    { name: "الدوال الأسية واللوغاريتمية" },
                    { name: "المتتاليات العددية" },
                    { name: "الاحتمالات" },
                    { name: "الهندسة في الفضاء" },
                    { name: "الأعداد المركبة" },
                    { name: "الحساب التكاملي" },
                    { name: "المعادلات التفاضلية" }
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    { name: "المتابعة الزمنية لتدفق كيميائي" },
                    { name: "التحولات النووية" },
                    { name: "الظواهر الكهربائية" },
                    { name: "حالة التوازن الكيميائي" },
                    { name: "الميكانيك" },
                    { name: "الأسترة" },
                    { name: "الاهتزازات الميكانيكية" },
                    { name: "الكهرومغناطيسية" }
                ] 
            },
            { 
                name: "علوم الطبيعة والحياة", 
                chapters: [
                    { name: "تركيب البروتين" },
                    { name: "بنية البروتين ووظيفته" },
                    { name: "النشاط الأنزيمي" },
                    { name: "المناعة" },
                    { name: "الاتصال العصبي" },
                    { name: "التكاثر" },
                    { name: "التركيب الضوئي والتنفس" },
                    { name: "التكتونية والجيولوجيا" },
                    { name: "الوراثة" }
                ] 
            },
            { 
                name: "الفلسفة", 
                has_exercises: false,
                chapters: [
                    { name: "المشكلة والإشكالية" },
                    { name: "الإدراك والاحساس" },
                    { name: "الذاكرة والخيال" },
                    { name: "اللغة والفكر" },
                    { name: "الشعور واللاشعور" },
                    { name: "المادة الحية والمادة الجامدة" },
                    { name: "الحقيقة" },
                    { name: "العدالة" },
                    { name: "الأخلاق" }
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    { name: "الأدب في عصر الضعف" },
                    { name: "مدرسة الإحياء والبعث" },
                    { name: "أدب المهجر والالتزام" },
                    { name: "الشعر التعليمي" },
                    { name: "فن المقال" },
                    { name: "القصة والرواية" },
                    { name: "النقد الأدبي" }
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
                    { name: "الأعداد والحساب" },
                    { name: "الدوال والاشتقاقية" },
                    { name: "المتتاليات" },
                    { name: "الأعداد المركبة" },
                    { name: "الحساب التكاملي" },
                    { name: "الاحتمالات" },
                    { name: "القواسم والمضاعفات" },
                    { name: "المعادلات التفاضلية" },
                    { name: "الهندسة التحليلية" },
                    { name: "المصفوفات" }
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    { name: "المتابعة الزمنية" },
                    { name: "التحولات النووية" },
                    { name: "الكهرباء" },
                    { name: "الميكانيك والنيوتن" },
                    { name: "الاهتزازات الميكانيكية" },
                    { name: "كيمياء توازن" },
                    { name: "الفيزياء النووية" },
                    { name: "الليزر" },
                    { name: "الأمواج" }
                ] 
            },
            { 
                name: "الهندسة التقنية", 
                chapters: [
                    { name: "الآليات والمنطق" },
                    { name: "مقاومة المواد" },
                    { name: "دراسة الأنظمة" },
                    { name: "الإنشاء الميكانيكي" },
                    { name: "الإنشاء المدني" },
                    { name: "التحكم الآلي" },
                    { name: "البرمجة" },
                    { name: "الدوائر الإلكترونية" }
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
                    { name: "Grammar" },
                    { name: "Vocabulary" },
                    { name: "Reading Comprehension" },
                    { name: "Writing" },
                    { name: "Technical English" }
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
                    { name: "الاهتلاكات والمخزونات" },
                    { name: "إعداد الميزانية والنتائج" },
                    { name: "محاسبة التكاليف الكلية" },
                    { name: "محاسبة التكاليف المتغيرة" },
                    { name: "تحليل الميزانية" },
                    { name: "التدفق المالي" },
                    { name: "القرار المالي" },
                    { name: "الاستثمار" }
                ] 
            },
            { 
                name: "الاقتصاد والمناجمت", 
                chapters: [
                    { name: "النقود والأسعار" },
                    { name: "النظام المصرفي" },
                    { name: "التجارة الخارجية" },
                    { name: "البطالة والتضخم" },
                    { name: "القيادة والرقابة" },
                    { name: "الاقتصاد الدولي" },
                    { name: "النمو الاقتصادي" },
                    { name: "التنمية" }
                ] 
            },
            { 
                name: "قانون", 
                chapters: [
                    { name: "عقد البيع" },
                    { name: "شركة المساهمة" },
                    { name: "عقد العمل" },
                    { name: "الضريبة على الدخل" },
                    { name: "الملكية الفكرية" },
                    { name: "القانون التجاري" },
                    { name: "النظام القانوني للمقاولات" }
                ] 
            },
            { 
                name: "الرياضيات (تسيير)", 
                chapters: [
                    { name: "المتتاليات" },
                    { name: "الدوال العددية" },
                    { name: "الإحصاء والاحتمالات" },
                    { name: "الرياضيات المالية" },
                    { name: "النمذجة الرياضية" },
                    { name: "المعادلات" }
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
                    { name: "Business English" },
                    { name: "Communication" },
                    { name: "Marketing" },
                    { name: "Management" }
                ] 
            }
        ]
    },
    {
        year: "bac",
        name: "BAC Lettres الشعب الأدبية",
        subjects: [
            { 
                name: "الرياضيات", 
                chapters: [
                    { name: "المتتاليات", url: "https://youtu.be/Vtl2Xk0IsXw?si=-D6hD4PFlUMUTU6C", resources: [{ type: "video", url: "https://youtu.be/Vtl2Xk0IsXw?si=-D6hD4PFlUMUTU6C", label: "Video Lesson" }, { type: "pdf", url: "https://www.dzexams.com/ar/documents/UjZPSm1aWTNQRkxBYkd3Z1FHMDFSQT09", label: "ملخص المتتاليات" }, { type: "exercise", url: "https://www.dzexams.com/ar/sujets/SjNMUDFkZ1J1ZlNMYnJCdmpzbmFOQT09", label: "فرض الفصل الاول" }] },
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
                    { name: "الدوال والاشتقاقية" },
                    { name: "كثيرات الحدود" },
                    { name: "المرجح" },
                    { name: "الزوايا الموجهة" },
                    { name: "المتتاليات" },
                    { name: "الاحتمالات" },
                    { name: "المعادلات والمتراجحات" },
                    { name: "التفاضل" }
                ] 
            },
            { 
                name: "العلوم الفيزيائية", 
                chapters: [
                    { name: "العمل والطاقة الحركية" },
                    { name: "الطاقة الكامنة" },
                    { name: "الغاز المثالي" },
                    { name: "المعايرة الكيميائية" },
                    { name: "الناقلية الكهربائية" },
                    { name: "الكيمياء العضوية" },
                    { name: "التفاعلات الكيميائية" },
                    { name: "الحركة" }
                ] 
            },
            { 
                name: "علوم الطبيعة والحياة", 
                chapters: [
                    { name: "النمو والتجديد الخلوي" },
                    { name: "التنسيق الهرموني" },
                    { name: "الانقسام والالقاح" },
                    { name: "بنية الخلية" },
                    { name: "الطفرات الوراثية" },
                    { name: "الوراثة" },
                    { name: "التنفس" },
                    { name: "التغذية" }
                ] 
            },
            { 
                name: "اللغة العربية", 
                chapters: [
                    { name: "العصر العباسي" },
                    { name: "النقد الأدبي القديم" },
                    { name: "الأدب الأندلسي" },
                    { name: "الموشحات" },
                    { name: "الشعر في العصر الحديث" },
                    { name: "القصة" },
                    { name: "المقال" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "السيرة النبوية" },
                    { name: "الفتوحات الإسلامية" },
                    { name: "الحضارة الإسلامية" },
                    { name: "التوحيد" },
                    { name: "العبادات" },
                    { name: "الأخلاق" }
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
                    { name: "العصر العباسي الثاني" },
                    { name: "النقد الأدبي القديم" },
                    { name: "الأدب الأندلسي" },
                    { name: "الموشحات" },
                    { name: "الشعر في العصر الحديث" },
                    { name: "القصة القصيرة" },
                    { name: "المقال الأدبي" }
                ] 
            },
            { 
                name: "الفلسفة", 
                has_exercises: false,
                chapters: [
                    { name: "مدخل إلى الفلسفة" },
                    { name: "المنطق الصوري" },
                    { name: "المذاهب الفلسفية" },
                    { name: "الفلسفة اليونانية" },
                    { name: "فلسفة العصر الحديث" }
                ] 
            },
            { 
                name: "اللغة الإنجليزية", 
                chapters: [
                    { name: "Science and Tech" },
                    { name: "Waste not, Want not" },
                    { name: "Environment" }
                ] 
            },
            { 
                name: "التاريخ والجغرافيا", 
                chapters: [
                    { name: "أوضاع الجزائر في العهد العثماني" },
                    { name: "النهضة الأوروبية" },
                    { name: "الاستعمار الحديث" },
                    { name: "القارة الأفريقية" },
                    { name: "العالم الإسلامي" }
                ] 
            },
            { 
                name: "العلوم الإسلامية", 
                has_exercises: false,
                chapters: [
                    { name: "التوحيد" },
                    { name: "العبادات" },
                    { name: "السيرة" },
                    { name: "الأخلاق" }
                ] 
            }
        ]
    },
    // ==================== L1 ====================
    {
        year: "l1",
        name: "L1 Informatique S1 الفصل الأول",
        subjects: [
            { 
                name: "Analyse 1", 
                chapters: [
                    { name: "Logique mathématique" },
                    { name: "Les nombres réels" },
                    { name: "Les suites réelles" }
                ] 
            },
            { 
                name: "Algèbre 1", 
                chapters: [
                    { name: "Logique et Raisonnements" },
                    { name: "Ensemble et applications" },
                    { name: "Relation Binaire" }
                ] 
            },
            { 
                name: "Algorithmique 1", 
                chapters: [
                    { name: "Introduction à l'algorithmique" },
                    { name: "Les types de données" },
                    { name: "Les structures de contrôle" },
                    { name: "Les boucles" },
                    { name: "Les tableaux" }
                ] 
            },
            { 
                name: "Structure Machine 1", 
                chapters: [
                    { name: "Systèmes de numération" },
                    { name: "Algèbre de Boole" },
                    { name: "Circuits combinatoires" },
                    { name: "Circuits séquentiels" },
                    { name: "Mémoires" },
                    { name: "Architecture de base" }
                ] 
            }
        ]
    },
    {
        year: "l1",
        name: "L1 Informatique S2 االفصل الثاني",
        subjects: [
            { 
                name: "Analyse 2", 
                chapters: [
                    { name: "Limites et continuité" },
                    { name: "Dérivabilité", url: "https://youtu.be/GxuoqURhDVA?si=mowdnX9g-Jzceue2", resources: [{ type: "video", url: "https://youtu.be/GxuoqURhDVA?si=mowdnX9g-Jzceue2", label: "Video" }] },
                    { name: "Intégration" },
                    { name: "Équations différentielles" },
                    { name: "Fonctions de plusieurs variables" },
                    { name: "Séries numériques" }
                ] 
            },
            { 
                name: "Algèbre 2", 
                chapters: [
                    { name: "Espace victorial" },
                    { name: "Application Linear" },
                    { name: "Matrices" },
                    { name: "Resolution de systmme d'equations" }
                ] 
            },
            { 
                name: "Algorithmique 2", 
                chapters: [
                    { name: "les structure" },
                    { name: "les fonction et procedure" },
                    { name: "les piles" }
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
                    { name: "Assembly Language" }
                ] 
            },
            { 
                name: "Algorithmique 3", 
                chapters: [
                    { name: "Complexité" },
                    { name: "Récursivité" },
                    { name: "Listes chaînées" },
                    { name: "Piles et Files" },
                    { name: "Arbres binaires" }
                ] 
            },
            { 
                name: "Systèmes d'information", 
                chapters: [
                    { name: "Introduction" },
                    { name: "Modèle conceptuel des données (MCD)" },
                    { name: "Modèle logique des données (MLD)" },
                    { name: "Normalisation" }
                ] 
            },
            { 
                name: "Théorie des graphes", 
                chapters: [
                    { name: "Généralités 'concepts fondamentaux de la theorie des graphes'" },
                    { name: "Chemins et circuits" },
                    { name: "Connexite dans un graphe" },
                    { name: "Arbres et Arborescences" }
                ] 
            },
            { 
                name: "Logique Mathématique", 
                chapters: [
                    { name: "Syntaxe" },
                    { name: "Sémantique" },
                    { name: "Résolution" }
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
                    { name: "Alphabets et mots" },
                    { name: "Grammaires" },
                    { name: "Automates à états finis" },
                    { name: "Expressions régulières" }
                ] 
            },
            { 
                name: "Système d'exploitation 1", 
                chapters: [
                    { name: "Introduction" },
                    { name: "Gestion des processus" },
                    { name: "Ordonنancement" },
                    { name: "Gestion de la mémoire" }
                ] 
            },
            { 
                name: "Bases de données", 
                chapters: [
                    { name: "Introduction" },
                    { name: "Modèle relationnel" },
                    { name: "Algèbre relationnelle" },
                    { name: "Langage SQL" }
                ] 
            },
            { 
                name: "Réseaux", 
                chapters: [
                    { name: "Modèle OSI et TCP/IP" },
                    { name: "Couche physique" },
                    { name: "Couche liaison" },
                    { name: "Couche réseau" }
                ] 
            },
            { 
                name: "POO (Java/C++)", 
                chapters: [
                    { name: "Classes et objets" },
                    { name: "Héritage" },
                    { name: "Polymorphisme" },
                    { name: "Interfaces" },
                    { name: "Exceptions" }
                ] 
            },
            { 
                name: "Développement Web", 
                chapters: [
                    { name: "HTML5" },
                    { name: "CSS3" },
                    { name: "JavaScript" },
                    { name: "PHP / Backend Basics" }
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
                    { name: "Séries numériques" },
                    { name: "Séries entières" },
                    { name: "Fonctions de plusieurs variables" },
                    { name: "Intégrales multiples" }
                ] 
            },
            { 
                name: "Algèbre 3", 
                chapters: [
                    { name: "Groupes" },
                    { name: "Anneaux" },
                    { name: "Corps" },
                    { name: "Arithmétique" }
                ] 
            },
            { 
                name: "Physique 2", 
                chapters: [
                    { name: "Mécanique analytique" },
                    { name: "Électromagnétisme" },
                    { name: "Optique ondulatoire" },
                    { name: "Physique quantique" }
                ] 
            },
            { 
                name: "Chimie 2", 
                chapters: [
                    { name: "Cinétique chimique" },
                    { name: "Équilibre chimique" },
                    { name: "Chimie organique" },
                    { name: "Thermochimie" }
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
                    { name: "Espaces de Banach" },
                    { name: "Espaces de Hilbert" },
                    { name: "Opérateurs linéaires" },
                    { name: "Théorie spectrale" }
                ] 
            },
            { 
                name: "Probabilités", 
                chapters: [
                    { name: "Espaces probabilisés" },
                    { name: "Variables aléatoires" },
                    { name: "Convergence" },
                    { name: "Théorèmes limites" },
                    { name: "Martingales" },
                    { name: "Processus stochastiques" }
                ] 
            },
            { 
                name: "Statistiques", 
                chapters: [
                    { name: "Estimation" },
                    { name: "Tests d'hypothèses" },
                    { name: "Régression" },
                    { name: "Analyse de variance" },
                    { name: "Statistiques bayésiennes" }
                ] 
            },
            { 
                name: "Topologie", 
                chapters: [
                    { name: "Espaces topologiques" },
                    { name: "Continuité" },
                    { name: "Compacité" },
                    { name: "Connexité" },
                    { name: "Complétude" }
                ] 
            }
        ]
    }
];
