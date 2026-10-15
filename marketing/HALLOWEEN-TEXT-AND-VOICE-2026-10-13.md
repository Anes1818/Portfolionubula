# النص النهائي للشاشة والتعليق الصوتي

لإعلان صاحب المشروع الذي يبدأ بطلب تعديل في إنستغرام، ويعرض إضافة القناع في الأداة ثم التقدير وطلب واتساب. الإرشادات بالعربية، والإعلان بالإنجليزية لأصحاب محلات الورد. النص جاهز للنسخ في ElevenLabs؛ لم يُنتج ملف صوت أو فيديو في هذه الخطوة.

## نص التعليق الصوتي الجاهز

> Florists, another “can you add this?”
>
> Send them your bouquet builder link.
>
> They try the design and see an estimate based on your prices.
>
> Then they send you a WhatsApp request.
>
> You confirm the arrangement and final quote.
>
> Florists, comment FLOWER for the demo.

نسخة للنسخ دون عناوين أو تعليمات: `HALLOWEEN-VOICE-ELEVENLABS-2026-10-13.txt`.

أداء مقترح: إنجليزية أمريكية بنبرة حديث طبيعية، واضحة وغير مبالغ فيها. وقفة قصيرة بعد سؤال البداية، ووضوح في كلمتي FLORISTS وFLOWER. الكلمة الأخيرة المطلوبة تُنطق Flower؛ الحروف الكبيرة شكل كتابي للـCTA، ولا تُهجّى حرفًا حرفًا. لا حاجة لصوت شخصية ثانية يمثل العميل، لأن السؤال ظاهر بالفعل في المحادثة.

## نصوص الشاشة — جاهزة

هذه عناوين قصيرة للمشاهد، وليست ترجمة حرفية للصوت. المدد مقترحة لنسخة نحو 25 ثانية؛ تضبط بعد توليد الصوت ومطابقته مع التسجيل الأصلي.

| الموضع المقترح | النص على الشاشة | اللقطة |
|---|---|---|
| 0–3 ث | **Florists: “Can you add this?”** | سؤال إضافة القناع في الرسائل، مكبر ومقروء. سطر سياق أصغر: **Example conversation**. |
| 3–6 ث | **Send your builder link.** | رد “try the idea here” وفتح الرابط؛ لا تعرض الكتابة كاملة. |
| 6–12 ث | **Let them try the design.** | اختيار التصميم وإضافة القناع الفعلية. سطر سياق أصغر عند دخول الأداة: **Builder demo**. |
| 12–15 ث | **An estimate from your prices.** | التقدير النهائي المطابق $235، مع سطر **Demo prices**. |
| 15–19 ث | **Their choices → your WhatsApp** | مراجعة الطلب ثم مسودة/رسالة واتساب. النص الصوتي يوضح أن العميل يرسل الطلب. |
| 19–22 ث | **You confirm the arrangement + quote.** | الباقة أو ورقة الطلب المطابقة. |
| 22–25 ث | **Florists: comment FLOWER** ثم **for the demo link.** | الباقة النهائية؛ سطر أصغر **Your shop link · $29/month**. اترك وقتًا للقراءة. |

إذا عُرض النص الصوتي كله كـsubtitles، اجعل العناوين أعلاه بديلًا اختياريًا، أو احتفظ فقط بالهوك والـCTA. لا تجمع عناوين طويلة وترجمة طويلة فوق عناصر الأداة.

## تقسيم subtitles مطابق للكلام

استخدم الأسطر الآتية ككتل قراءة قصيرة. التزامن الفعلي يُنشأ من ملف الصوت النهائي؛ لا توجد SRT موقّتة أو محاذاة مؤكدة من الصور وحدها.

```text
Florists, another
"can you add this?"

Send them your
bouquet builder link.

They try the design
and see an estimate

based on your prices.

Then they send you
a WhatsApp request.

You confirm the arrangement
and final quote.

Florists, comment FLOWER
for the demo.
```

ضع النص في مساحة خالية من السؤال والقناع والتقدير وأزرار الطلب؛ تجنب أسفل الشاشة الذي تغطيه واجهة إنستغرام. خط واضح عالي التباين وبحد أقصى سطرين في كتلة الترجمة. لا تحتاج انتقالات مبالغًا فيها. النهاية فعل واحد: التعليق بـFLOWER.

## كابشن جاهز

> “Can you add a mask?”
>
> Florists: give your customer a visual starting point for that conversation. They customize an available design, see an estimate from your configured prices, and prepare a request for your WhatsApp. You confirm availability, the final arrangement and the quote.
>
> $29/month for one Nebula-hosted shop builder link using the existing artwork library. No basic setup fee. Pay after your version is live. Cancel anytime.
>
> Example conversation and builder demo with sample prices. Comment FLOWER for the demo link.

## ما يزال مطلوبًا للإنتاج

- توليد التعليق الصوتي من النص، ثم إرفاق ملفه مع الفيديو الأصلي لضبط التوقيت.
- الإبقاء على حالات التصميم والتقدير متطابقة؛ طلب واتساب ليس طلبًا مؤكدًا أو عملية دفع.
- تنفيذ إجراءات إعداد النسخة العامة الواردة في خطة 13 أكتوبر: إخفاء بيانات الاتصال واستخدام صور مرخصة. لا ننشر أو نرسل رسائل ضمن هذه المهمة، ولا يوجد رد آلي على FLOWER مُعدّ.
