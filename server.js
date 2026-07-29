const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// خدمة كافة ملفات التطبيق الإستاتيكية
app.use(express.static(__dirname));

// جميع المسارات تعود إلى index.html (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 تطبيق مفاضلة جامعة صنعاء يعمل على المنفذ: http://localhost:${PORT}`);
});
