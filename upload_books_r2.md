# رفع الكتب إلى Cloudflare R2

1. أنشئ في Cloudflare حاوية R2 باسم `saffi-books` (المجاني 10 جيجابايت).
2. أنشئ مفتاح API لـR2 بنفسك (Access Key + Secret) واحتفظ بهما عندك فقط.
3. ثبّت rclone وأعدّ remote باسم `r2` بتلك المفاتيح.
4. من مجلد الدراسة الذي فيه مجلدات الصفوف شغّل لكل مجلد صف:
   `rclone copy "صف العاشر" r2:saffi-books/10 --progress`
5. اجعل الحاوية عامة أو اربطها بنطاق، وضع رابطها في `data/books_catalog.json` (الحقل path ← الرابط).
