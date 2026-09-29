# 🗳️ पंचायत चुनाव मतदाता पर्ची एवं खोज पोर्टल 2026 (Panchayat Voter Portal)

पंचायत समिति **भिनाय (अजमेर)** की समस्त 30 ग्राम पंचायतों एवं 312 वार्डों के लिए मतदाता सूची खोज, वार्डवार मतदाता नामावली, तथा राज्य निर्वाचन आयोग के मानक अनुरूप आधिकारिक **मतदाता सूचना पर्ची (Voter Information Slip)** जनरेटर।

## 🔗 लाइव Google Drive एवं Google Sheets लिंक्स (Live On Your Google Drive)

1. 📂 **Google Drive फोल्डर:** [panchayat election](https://drive.google.com/drive/folders/1pTvgY_3NWyHfLk2v3c-l0d7sodHiRl5B)
2. 👥 **Admin Sheet (लॉगिन, पासवर्ड व अनुमत वार्ड):** [1_Admin_Access_Control](https://docs.google.com/spreadsheets/d/16AbjKd1JoQ1mvJ3kpoRjxgCEyQXLUlGELYkabbQmgpc/edit)
3. 🗳️ **Voter Master Sheet (मतदाता मास्टर डेटाबेस):** [2_Voter_Master_Data](https://docs.google.com/spreadsheets/d/1CWJ9YjXBUe-BbDOoDrp60vAV9hLP7Yyziphu3ac825I/edit)

---

## 🌟 प्रमुख विशेषताएं (Key Features)

1. **स्मार्ट मतदाता खोज (Smart Voter Search):**
   - मतदाता का नाम (हिंदी या अंग्रेजी में जैसे "रमेश" या "Ramesh")
   - पिता/पति का नाम
   - मकान संख्या
   - पहचान पत्र क्रमांक (EPIC No.)
   - सरल क्रमांक (Serial Number)
   - वास्तविक समय में संबंधित सभी नाम तुरंत सामने आ जाते हैं।

2. **आधिकारिक मतदाता सूचना पर्ची (Official Voter Slip):**
   - किसी भी मतदाता के नाम पर क्लिक करते ही पूरी विस्तृत प्रोफाइल खुलती है:
     - किस ग्राम पंचायत व किस वार्ड में नाम है
     - किस मतदान केंद्र (बूथ) पर वोट है तथा कमरा संख्या क्या है
     - मतदाता सरल क्रमांक (Serial No)
     - पिता/पति का नाम, मकान संख्या, आयु व लिंग
     - आधिकारिक सुरक्षा QR कोड सत्यापन
   - **🖨️ पर्ची प्रिंट करें:** 1-क्लिक में थर्मल प्रिंटर या A4 पर साफ-सुथरा प्रिंट।
   - **💬 व्हाट्सएप पर शेयर करें:** 1-क्लिक में मतदाता को पूरा विवरण हिंदी में व्हाट्सएप संदेश के रूप में भेजें।

3. **सुरक्षित लॉगिन एवं वार्डवार एक्सेस नियंत्रण (Role-based Access Control):**
   - **Super Admin:** सभी 30 पंचायतों व 312 वार्डों का पूर्ण नियंत्रण।
   - **Panchayat / Booth Agent:** केवल अपनी आवंटित पंचायत व निर्धारित वार्डों के ही मतदाताओं को देख व खोज सकते हैं। अन्य वार्ड लॉक रहते हैं।
   - सभी लॉगिन, पासवर्ड एवं वार्ड अधिकार Google Sheet की `Admin_Access_Control` शीट से नियंत्रित होते हैं।

4. **वार्डवार मतदाता सूची (Ward Directory):**
   - ग्राम पंचायत ➔ वार्ड ➔ मतदान केंद्र चुनकर पूरे वार्ड की मतदाता सूची टेबल के रूप में देखें।
   - पुरुष, महिला एवं कुल मतदाताओं की वास्तविक सांख्यिकी।
   - पूरे वार्ड की सूची को CSV में डाउनलोड करें या प्रिंट करें।

5. **Google Sheets लाइव सिंक एवं ऑफलाइन मोड:**
   - Google Drive की शीट से लाइव डेटा सिंक।
   - ऑफलाइन काम करने की सुविधा (बिना इंटरनेट के भी ब्राउज़र में काम करता है)।

---

## 🔑 डिफ़ॉल्ट लॉगिन क्रेडेंशियल्स (Default Logins)

| भूमिका | यूजरनेम | पासवर्ड | अधिकार (Access) |
|---|---|---|---|
| **Super Admin** | `admin` | `admin@2026` | सभी 30 पंचायतें, सभी 312 वार्ड |
| **Control Room** | `control_room` | `control@2026` | सभी 30 पंचायतें, सभी 312 वार्ड |
| **देवपुरा प्रभारी (GP11)** | `gp11_incharge` | `gp11#2026` | केवल देवपुरा (वार्ड 1 से 11) |
| **देवलिया कलां प्रभारी (GP12)** | `gp12_incharge` | `gp12#2026` | केवल देवलिया कलां (वार्ड 1 से 15) |
| **भिनाय प्रभारी (GP23)** | `gp23_incharge` | `gp23#2026` | केवल भिनाय (वार्ड 1 से 21) |
| *अन्य सभी 30 पंचायतें* | `gp01_incharge` से `gp30_incharge` | `gp01#2026` से `gp30#2026` | संबंधित पंचायत एवं वार्ड |

---

## 🌐 GitHub Pages पर लाइव पब्लिश करने का तरीका (How to Publish on GitHub Pages)

यह पूरा पोर्टल 100% क्लाइंट-साइड (Pure HTML5, CSS3, Vanilla JS) बना है, इसलिए इसे GitHub Pages पर बिना किसी सर्वर या अतिरिक्त खर्चे के लाइफटाइम मुफ्त में होस्ट किया जा सकता है:

### चरण 1: GitHub पर रिपोजिटरी बनाएं
1. [GitHub](https://github.com) पर लॉगिन करें।
2. **New Repository** बनाएं (जैसे नाम रखें: `panchayat-voter-slip`).
3. इसे **Public** रखें।

### चरण 2: फाइल्स अपलोड करें
इस फोल्डर (`voter_portal/`) की सभी फाइलों को रिपोजिटरी में डालें:
- `index.html` (रूट में होना चाहिए)
- `styles.css`
- `app.js`
- `master_data.js`
- `master_data.json`

यदि आप Git कमांड लाइन से अपलोड करना चाहते हैं:
```bash
git init
git add .
git commit -m "Panchayat Chunav Portal 2026"
git branch -M main
git remote add origin https://github.com/<your-username>/panchayat-voter-slip.git
git push -u origin main
```

### चरण 3: GitHub Pages सक्रिय करें
1. अपनी रिपोजिटरी की **Settings** टैब में जाएं।
2. बायीं तरफ मेनू में **Pages** पर क्लिक करें।
3. **Build and deployment** सेक्शन में:
   - Source: **Deploy from a branch**
   - Branch: **main** और फोल्डर: **/ (root)** चुनें।
4. **Save** पर क्लिक करें।

1 से 2 मिनट के भीतर आपकी लाइव वेबसाइट तैयार हो जाएगी:
```
https://<your-username>.github.io/panchayat-voter-slip/
```
अब कोई भी व्यक्ति इस लिंक पर क्लिक करके मोबाइल या कंप्यूटर पर सीधे पोर्टल चला सकता है!
