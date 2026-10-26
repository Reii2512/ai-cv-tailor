// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker berhasil didaftarkan!', reg))
            .catch(err => console.error('Service Worker gagal:', err));
    });
}

const SUPABASE_URL = 'https://rnvhxtcecetvhofpqmfp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_toGh6AjVMcFMZl3cPsDPoQ__fooMvq3';

try {
    if (window.supabase) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) { console.error('Init error:', e); }

window.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            handleAuthSession(session);
            window.supabaseClient.auth.onAuthStateChange((_event, session) => handleAuthSession(session));
        }
    } catch (err) { console.error('Session error:', err); }

    loadSavedFormData();
    setupAutoSave();
});

function handleAuthSession(session) {
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (session) {
        loginView.style.display = 'none';
        dashboardView.style.display = 'block';

        if (!localStorage.getItem('groq_api_key')) {
            setTimeout(() => openApiKeyModal(), 600);
        }
    } else {
        loginView.style.display = 'flex';
        dashboardView.style.display = 'none';
    }
}

function switchTab(index) {
    const panels = document.querySelectorAll('.wizard-panel');
    const tabs = document.querySelectorAll('.wizard-tab');

    panels.forEach((panel, i) => {
        panel.classList.toggle('active', i === index);
        tabs[i].classList.toggle('active', i === index);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loginWithGoogle() {
    if (!window.supabaseClient) return alert('Supabase belum siap!');
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert('Login Gagal: ' + error.message);
}

async function logout() {
    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
        window.location.reload();
    }
}

function openApiKeyModal() { document.getElementById('api-modal').style.display = 'flex'; }
function closeApiKeyModal() { document.getElementById('api-modal').style.display = 'none'; }

async function saveApiKey() {
    const key = document.getElementById('groq-api-key-input').value.trim();
    if (!key) return alert('API Key kosong!');
    
    localStorage.setItem('groq_api_key', key);

    if (window.supabaseClient) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) {
                const userId = session.user.id;
                const userEmail = session.user.email;

                const { error } = await window.supabaseClient
                    .from('user_profiles')
                    .upsert({ 
                        id: userId, 
                        email: userEmail, 
                        groq_api_key: key,
                        updated_at: new Date()
                    });

                if (error) {
                    console.error('Gagal sinkronisasi ke database:', error.message);
                }
            }
        } catch (err) {
            console.error('Error database sync:', err);
        }
    }

    alert('Groq API Key berhasil disimpan & disinkronkan ke database!');
    closeApiKeyModal();
}

function setupAutoSave() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', saveFormDataToLocal);
        input.addEventListener('change', saveFormDataToLocal);
    });
}

function saveFormDataToLocal() {
    const selectedTheme = document.querySelector('input[name="cv-theme"]:checked')?.value || 'corporate';
    const formData = {
        theme: selectedTheme,
        language: document.getElementById('cv-language')?.value || 'id',
        jobCompany: document.getElementById('job-company')?.value || '',
        jobRole: document.getElementById('job-role')?.value || '',
        jobDesc: document.getElementById('job-desc')?.value || '',
        name: document.getElementById('kinobi-name')?.value || '',
        email: document.getElementById('kinobi-email')?.value || '',
        countryCode: document.getElementById('kinobi-country-code')?.value || '+62',
        phone: document.getElementById('kinobi-phone')?.value || '',
        location: document.getElementById('kinobi-location')?.value || '',
        summary: document.getElementById('kinobi-summary')?.value || '',
        skills: document.getElementById('kinobi-skills')?.value || '',
        portfolioLink: document.getElementById('kinobi-portfolio-link')?.value || '',
        experiences: [],
        educations: [],
        projects: []
    };

    document.querySelectorAll('.experience-item').forEach(el => {
        formData.experiences.push({
            title: el.querySelector('.exp-title')?.value || '',
            company: el.querySelector('.exp-company')?.value || '',
            start: el.querySelector('.exp-start')?.value || '',
            end: el.querySelector('.exp-end')?.value || '',
            desc: el.querySelector('.exp-desc')?.value || ''
        });
    });

    document.querySelectorAll('.education-item').forEach(el => {
        formData.educations.push({
            institution: el.querySelector('.edu-institution')?.value || '',
            location: el.querySelector('.edu-location')?.value || '',
            degree: el.querySelector('.edu-degree')?.value || '',
            period: el.querySelector('.edu-period')?.value || '',
            desc: el.querySelector('.edu-desc')?.value || ''
        });
    });

    document.querySelectorAll('.project-item').forEach(el => {
        formData.projects.push({
            name: el.querySelector('.proj-name')?.value || '',
            desc: el.querySelector('.proj-desc')?.value || ''
        });
    });

    localStorage.setItem('cv_builder_draft', JSON.stringify(formData));
}

function loadSavedFormData() {
    const saved = localStorage.getItem('cv_builder_draft');
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        if (data.theme) {
            const themeRadio = document.querySelector(`input[name="cv-theme"][value="${data.theme}"]`);
            if (themeRadio) themeRadio.checked = true;
        }
        if (data.language && document.getElementById('cv-language')) {
            document.getElementById('cv-language').value = data.language;
        }
        if (document.getElementById('job-company')) document.getElementById('job-company').value = data.jobCompany || '';
        if (document.getElementById('job-role')) document.getElementById('job-role').value = data.jobRole || '';
        if (document.getElementById('job-desc')) document.getElementById('job-desc').value = data.jobDesc || '';
        if (document.getElementById('kinobi-name')) document.getElementById('kinobi-name').value = data.name || '';
        if (document.getElementById('kinobi-email')) document.getElementById('kinobi-email').value = data.email || '';
        if (document.getElementById('kinobi-country-code')) document.getElementById('kinobi-country-code').value = data.countryCode || '+62';
        if (document.getElementById('kinobi-phone')) document.getElementById('kinobi-phone').value = data.phone || '';
        if (document.getElementById('kinobi-location')) document.getElementById('kinobi-location').value = data.location || '';
        if (document.getElementById('kinobi-summary')) document.getElementById('kinobi-summary').value = data.summary || '';
        if (document.getElementById('kinobi-skills')) document.getElementById('kinobi-skills').value = data.skills || '';
        if (document.getElementById('kinobi-portfolio-link')) document.getElementById('kinobi-portfolio-link').value = data.portfolioLink || '';

        if (data.experiences && data.experiences.length > 0) {
            const container = document.getElementById('experience-container');
            container.innerHTML = '';
            data.experiences.forEach(exp => {
                const item = document.createElement('div');
                item.className = 'experience-item card-sub';
                item.innerHTML = `
                    <div class="form-group">
                        <label>Posisi / Jabatan</label>
                        <input type="text" class="exp-title" value="${exp.title || ''}" placeholder="Contoh: IT Support Intern">
                    </div>
                    <div class="form-group">
                        <label>Nama Perusahaan / Instansi</label>
                        <input type="text" class="exp-company" value="${exp.company || ''}" placeholder="Contoh: PT Digital Kreasi Nusantara">
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Mulai</label>
                            <input type="month" class="exp-start" value="${exp.start || ''}">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Selesai</label>
                            <input type="month" class="exp-end" value="${exp.end || ''}">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label>Deskripsi Tugas</label>
                        <textarea class="exp-desc">${exp.desc || ''}</textarea>
                    </div>
                    <button type="button" onclick="removeExperience(this)" class="btn-danger-sm">Hapus Pengalaman</button>
                `;
                container.appendChild(item);
            });
        }

        if (data.educations && data.educations.length > 0) {
            const eduContainer = document.getElementById('education-container');
            eduContainer.innerHTML = '';
            data.educations.forEach(edu => {
                const item = document.createElement('div');
                item.className = 'education-item card-sub';
                item.innerHTML = `
                    <div class="form-group">
                        <label>Nama Institusi / Kampus</label>
                        <input type="text" class="edu-institution" value="${edu.institution || ''}" placeholder="Contoh: Universitas Teknologi Nusantara">
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Lokasi Kampus</label>
                            <input type="text" class="edu-location" value="${edu.location || ''}" placeholder="Contoh: Surabaya, Jawa Timur">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Gelar & Jurusan</label>
                            <input type="text" class="edu-degree" value="${edu.degree || ''}" placeholder="Contoh: Sarjana Teknik - Informatika">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Periode Masuk — Lulus</label>
                            <input type="text" class="edu-period" value="${edu.period || ''}" placeholder="Contoh: Aug 2021 - Aug 2025">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label>Rincian / Prestasi (Opsional)</label>
                        <textarea class="edu-desc">${edu.desc || ''}</textarea>
                    </div>
                    <button type="button" onclick="removeEducation(this)" class="btn-danger-sm">Hapus Pendidikan</button>
                `;
                eduContainer.appendChild(item);
            });
        }

        if (data.projects && data.projects.length > 0) {
            const projContainer = document.getElementById('project-container');
            projContainer.innerHTML = '';
            data.projects.forEach(proj => {
                const item = document.createElement('div');
                item.className = 'project-item card-sub';
                item.innerHTML = `
                    <div class="form-group">
                        <label>Nama Proyek</label>
                        <input type="text" class="proj-name" value="${proj.name || ''}" placeholder="Contoh: E-Commerce Web Platform">
                    </div>
                    <div class="form-group full-width">
                        <label>Deskripsi & Teknologi</label>
                        <textarea class="proj-desc">${proj.desc || ''}</textarea>
                    </div>
                    <button type="button" onclick="removeProject(this)" class="btn-danger-sm">Hapus Proyek</button>
                `;
                projContainer.appendChild(item);
            });
        }

        setupAutoSave();
    } catch (e) {
        console.error('Gagal memuat draft:', e);
    }
}

function addExperience() {
    const container = document.getElementById('experience-container');
    const item = document.createElement('div');
    item.className = 'experience-item card-sub';
    item.innerHTML = `
        <div class="form-group">
            <label>Posisi / Jabatan</label>
            <input type="text" class="exp-title" placeholder="Contoh: IT Support Intern">
        </div>
        <div class="form-group">
            <label>Nama Perusahaan / Instansi</label>
            <input type="text" class="exp-company" placeholder="Contoh: PT Digital Kreasi Nusantara">
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label>Mulai</label>
                <input type="month" class="exp-start">
            </div>
            <div class="form-group" style="flex:1;">
                <label>Selesai</label>
                <input type="month" class="exp-end">
            </div>
        </div>
        <div class="form-group full-width">
            <label>Deskripsi Tugas</label>
            <textarea class="exp-desc" placeholder="Tuliskan tugas dan pencapaian..."></textarea>
        </div>
        <button type="button" onclick="removeExperience(this)" class="btn-danger-sm">Hapus Pengalaman</button>
    `;
    container.appendChild(item);
    setupAutoSave();
}

function removeExperience(btn) {
    const items = document.querySelectorAll('.experience-item');
    if (items.length > 1) {
        btn.closest('.experience-item').remove();
        saveFormDataToLocal();
    } else {
        alert('Minimal harus ada 1 pengalaman kerja!');
    }
}

function addEducation() {
    const container = document.getElementById('education-container');
    const item = document.createElement('div');
    item.className = 'education-item card-sub';
    item.innerHTML = `
        <div class="form-group">
            <label>Nama Institusi / Kampus</label>
            <input type="text" class="edu-institution" placeholder="Contoh: Universitas Teknologi Nusantara">
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label>Lokasi Kampus</label>
                <input type="text" class="edu-location" placeholder="Contoh: Surabaya, Jawa Timur">
            </div>
            <div class="form-group" style="flex:1;">
                <label>Gelar & Jurusan</label>
                <input type="text" class="edu-degree" placeholder="Contoh: Sarjana Teknik - Informatika">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label>Periode Masuk — Lulus</label>
                <input type="text" class="edu-period" placeholder="Contoh: Aug 2021 - Aug 2025">
            </div>
        </div>
        <div class="form-group full-width">
            <label>Rincian / Prestasi (Opsional)</label>
            <textarea class="edu-desc" placeholder="Contoh: Lulus dengan predikat Cum Laude (IPK 3.75/4.00)..."></textarea>
        </div>
        <button type="button" onclick="removeEducation(this)" class="btn-danger-sm">Hapus Pendidikan</button>
    `;
    container.appendChild(item);
    setupAutoSave();
}

function removeEducation(btn) {
    const items = document.querySelectorAll('.education-item');
    if (items.length > 1) {
        btn.closest('.education-item').remove();
        saveFormDataToLocal();
    } else {
        alert('Minimal harus ada 1 riwayat pendidikan!');
    }
}

function addProject() {
    const container = document.getElementById('project-container');
    const item = document.createElement('div');
    item.className = 'project-item card-sub';
    item.innerHTML = `
        <div class="form-group">
            <label>Nama Proyek</label>
            <input type="text" class="proj-name" placeholder="Contoh: E-Commerce Web Platform">
        </div>
        <div class="form-group full-width">
            <label>Deskripsi & Teknologi</label>
            <textarea class="proj-desc" placeholder="Gunakan React, Node.js, dll..."></textarea>
        </div>
        <button type="button" onclick="removeProject(this)" class="btn-danger-sm">Hapus Proyek</button>
    `;
    container.appendChild(item);
    setupAutoSave();
}

function removeProject(btn) {
    btn.closest('.project-item').remove();
    saveFormDataToLocal();
}

async function callGroqAIJSON(apiKey, prompt) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
            model: "qwen/qwen3.8-27b",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    const resData = await response.json();
    if (resData.error) throw new Error(resData.error.message);

    if (resData.choices && resData.choices[0].message) {
        return JSON.parse(resData.choices[0].message.content.trim());
    } else {
        throw new Error("Respons AI Groq kosong.");
    }
}

async function generateKinobiCV() {
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('Masukkan Groq API Key terlebih dahulu!');
        return openApiKeyModal();
    }

    const selectedTheme = document.querySelector('input[name="cv-theme"]:checked')?.value || 'corporate';
    const cvLanguage = document.getElementById('cv-language')?.value || 'id';
    const jobCompany = document.getElementById('job-company').value.trim();
    const jobRole = document.getElementById('job-role').value.trim();
    const jobDesc = document.getElementById('job-desc').value.trim();
    const name = document.getElementById('kinobi-name').value.trim();
    const email = document.getElementById('kinobi-email').value.trim();
    const countryCode = document.getElementById('kinobi-country-code').value;
    const phoneInput = document.getElementById('kinobi-phone').value.trim();
    const fullPhone = phoneInput ? `${countryCode} ${phoneInput}` : '';
    const location = document.getElementById('kinobi-location').value.trim();
    const summary = document.getElementById('kinobi-summary').value.trim();
    const skills = document.getElementById('kinobi-skills').value.trim();
    const portfolioLink = document.getElementById('kinobi-portfolio-link').value.trim();

    const expElements = document.querySelectorAll('.experience-item');
    let experiencesText = '';
    expElements.forEach((el, index) => {
        const title = el.querySelector('.exp-title').value.trim();
        const company = el.querySelector('.exp-company').value.trim();
        const start = el.querySelector('.exp-start').value.trim();
        const end = el.querySelector('.exp-end').value.trim();
        const desc = el.querySelector('.exp-desc').value.trim();
        
        if (title || company) {
            experiencesText += `\n[Pengalaman ${index + 1}]
- Jabatan: ${title}
- Perusahaan: ${company}
- Periode: ${start || 'Sekarang'} s/d ${end || 'Sekarang'}
- Deskripsi: ${desc}\n`;
        }
    });

    const eduElements = document.querySelectorAll('.education-item');
    let educationsText = '';
    eduElements.forEach((el, index) => {
        const institution = el.querySelector('.edu-institution').value.trim();
        const locationEdu = el.querySelector('.edu-location').value.trim();
        const degree = el.querySelector('.edu-degree').value.trim();
        const period = el.querySelector('.edu-period').value.trim();
        const desc = el.querySelector('.edu-desc').value.trim();
        
        if (institution || degree) {
            educationsText += `\n[Pendidikan ${index + 1}]
- Institusi: ${institution}
- Lokasi: ${locationEdu}
- Gelar & Jurusan: ${degree}
- Periode: ${period}
- Rincian: ${desc}\n`;
        }
    });

    const projElements = document.querySelectorAll('.project-item');
    let projectsText = '';
    projElements.forEach((el, index) => {
        const nameProj = el.querySelector('.proj-name').value.trim();
        const descProj = el.querySelector('.proj-desc').value.trim();
        
        if (nameProj) {
            projectsText += `\n[Proyek ${index + 1}]
- Nama: ${nameProj}
- Deskripsi: ${descProj}\n`;
        }
    });

    if (!jobDesc || !experiencesText || !skills) {
        alert('Harap isi minimal Job Description, setidaknya 1 Pengalaman Kerja, dan Keahlian!');
        return;
    }

    switchTab(4);
    
    const scoreCircle = document.querySelector('.score-circle');
    const scoreDesc = document.getElementById('score-desc');
    const feedbackBox = document.getElementById('ats-feedback-box');
    const paperPreview = document.getElementById('cv-paper-preview');
    const coverLetterBox = document.getElementById('cover-letter-box');

    scoreCircle.textContent = '...';
    scoreDesc.textContent = 'Menganalisis kecocokan ATS...';
    feedbackBox.textContent = 'Senior Headhunter sedang meninjau profil dan kecocokan lowongan...';
    coverLetterBox.textContent = 'Menyiapkan draft Cover Letter & Body Email...';
    
    paperPreview.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <span>Senior Headhunter & Qwen AI sedang menyusun optimasi dokumen CV...</span>
        </div>
    `;

    const languageInstruction = cvLanguage === 'en' 
        ? "SELURUH OUTPUT CV & COVER LETTER HARUS DITULIS DALAM BAHASA INGGRIS (ENGLISH) YANG PROFESIONAL." 
        : "SELURUH OUTPUT CV & COVER LETTER HARUS DITULIS DALAM BAHASA INDONESIA YANG PROFESIONAL.";

    const prompt = `Bertindaklah sebagai Senior Headhunter dan Senior HRD Profesional yang sangat tajam, objektif, namun proporsional dan realistis. Analisis data kandidat terhadap Target Perusahaan, Target Posisi, dan Job Description berikut.

ATURAN EVALUASI ADAPTIF BERDASARKAN LEVEL POSISI:
- Jika posisi yang dilamar adalah Entry-Level, Junior, Trainee, Fresh Graduate, atau Magang (Intern): Fokuskan penilaian pada potensi dasar, fondasi keahlian teknis, proyek (capstone/portofolio), pengalaman magang, dan antusiasme belajar. Jangan menghukum kandidat karena kurangnya pengalaman bertahun-tahun atau posisi manajerial. Berikan saran yang membangun untuk anak fresh graduate/junior.
- Jika posisi Mid-Level atau Senior: Nilai aspek kepemimpinan, metrik pencapaian bisnis, skalabilitas, dan penguasaan teknis tingkat lanjut secara ketat.

PENTING UNTUK FORMAT HEADER:
- Variabel "fullName" HANYA diisi dengan nama lengkap kandidat saja TANPA gelar akademis.
- Variabel "professionalTitle" diisi dengan gabungan gelar dan peran utama secara profesional.

Berikan respons HANYA dalam format JSON murni dengan struktur persis berikut:
{
  "atsScore": "90%",
  "feedback": "Ulasan kritis ala headhunter: soroti kecocokan, keunggulan kompetitif kandidat, serta celah/gap secara jujur namun tetap realistis dan suportif sesuai level posisi yang dilamar.",
  "fullName": "Nama Lengkap Tanpa Gelar",
  "professionalTitle": "Gelar & Judul Peran Utama",
  "summary": "Ringkasan profesional yang dioptimalkan sesuai level posisi...",
  "educations": [
    {
      "institution": "Nama Institusi",
      "location": "Lokasi Kampus",
      "degree": "Gelar & Jurusan",
      "period": "Rentang Waktu",
      "description": "Rincian prestasi atau keterangan..."
    }
  ],
  "experiences": [
    {
      "title": "Jabatan yang dioptimalkan ATS",
      "company": "Nama Perusahaan",
      "period": "Bulan Tahun - Bulan Tahun",
      "description": "Butir pencapaian tugas profesional yang disesuaikan..."
    }
  ],
  "projects": [
    {
      "name": "Nama Proyek",
      "description": "Deskripsi proyek..."
    }
  ],
  "skills": "${skills}",
  "coverLetter": "Tuliskan draft body email / cover letter lamaran kerja profesional yang nada bicaranya pas, percaya diri, persuasif, dan realistis dengan level posisi yang dilamar (misalnya menonjolkan semangat belajar & fundamental kuat untuk entry-level) kepada HRD perusahaan terkait."
}

INSTRUKSI BAHASA: ${languageInstruction}

Target Perusahaan (PT):
${jobCompany || 'Perusahaan'}

Target Posisi / Role yang Dilamar:
${jobRole || 'Posisi Terkait'}

Target Job Description:
${jobDesc}

Data Kandidat:
- Tema Dipilih: ${selectedTheme}
- Nama & Gelar Input: ${name}
- Ringkasan: ${summary}
- Riwayat Pendidikan:${educationsText}
- Riwayat Pengalaman Kerja:${experiencesText}
- Daftar Proyek:${projectsText}
- Skill: ${skills}`;

    try {
        const result = await callGroqAIJSON(apiKey, prompt);
        
        scoreCircle.textContent = result.atsScore || '90%';
        scoreDesc.textContent = 'Analisis dan optimasi ATS selesai.';
        feedbackBox.textContent = result.feedback || 'CV berhasil dioptimalkan sesuai lowongan.';
        coverLetterBox.textContent = result.coverLetter || 'Cover letter tidak tersedia.';

        paperPreview.className = `cv-paper theme-${selectedTheme}`;

        const contactParts = [];
        if (location) contactParts.push(location);
        if (email) contactParts.push(`<a href="mailto:${email}">${email}</a>`);
        if (fullPhone) {
            const cleanPhone = fullPhone.replace(/[^0-9+]/g, '');
            contactParts.push(`<a href="tel:${cleanPhone}">${fullPhone}</a>`);
        }
        if (portfolioLink) {
            const formattedUrl = portfolioLink.startsWith('http') ? portfolioLink : 'https://' + portfolioLink;
            contactParts.push(`<a href="${formattedUrl}" target="_blank">${portfolioLink}</a>`);
        }
        const finalContactHtml = contactParts.join(' • ');

        let htmlContent = `
            <div class="cv-paper-header">
                <h1 contenteditable="false">${result.fullName || name}</h1>
                <div class="cv-title-role" contenteditable="false">${result.professionalTitle || jobRole || 'Professional Candidate'}</div>
                <div class="cv-contact" contenteditable="false">${finalContactHtml}</div>
            </div>

            <div class="cv-section-title" contenteditable="false">${cvLanguage === 'en' ? 'Professional Summary' : 'Ringkasan Profesional'}</div>
            <p contenteditable="false">${result.summary || summary}</p>

            <div class="cv-section-title" contenteditable="false">${cvLanguage === 'en' ? 'Professional Experience / Internships' : 'Pengalaman Kerja / Magang'}</div>
        `;

        if (result.experiences && result.experiences.length > 0) {
            result.experiences.forEach(exp => {
                htmlContent += `
                    <div class="cv-item">
                        <div class="cv-item-header">
                            <span contenteditable="false">${exp.title} — <em>${exp.company}</em></span>
                            <span contenteditable="false">${exp.period}</span>
                        </div>
                        <p contenteditable="false">${exp.description}</p>
                    </div>
                `;
            });
        }

        htmlContent += `<div class="cv-section-title" contenteditable="false">${cvLanguage === 'en' ? 'Education' : 'Jenjang Pendidikan'}</div>`;
        if (result.educations && result.educations.length > 0) {
            result.educations.forEach(edu => {
                htmlContent += `
                    <div class="cv-item">
                        <div class="cv-item-header">
                            <span contenteditable="false">${edu.institution} — <em>${edu.location}</em></span>
                            <span contenteditable="false">${edu.period}</span>
                        </div>
                        <p contenteditable="false"><strong>${edu.degree}</strong></p>
                        ${edu.description ? `<p contenteditable="false">${edu.description}</p>` : ''}
                    </div>
                `;
            });
        }

        htmlContent += `
            <div class="cv-section-title" contenteditable="false">${cvLanguage === 'en' ? 'Core Skills' : 'Keahlian Utama (Skills)'}</div>
            <p contenteditable="false">${result.skills || skills}</p>
        `;

        if (result.projects && result.projects.length > 0) {
            htmlContent += `<div class="cv-section-title" contenteditable="false">${cvLanguage === 'en' ? 'Projects & Portfolio' : 'Proyek & Portofolio'}</div>`;
            result.projects.forEach(proj => {
                htmlContent += `
                    <div class="cv-item">
                        <div class="cv-item-header">
                            <span contenteditable="false"><strong>${proj.name}</strong></span>
                        </div>
                        <p contenteditable="false">${proj.description}</p>
                    </div>
                `;
            });
        }

        paperPreview.innerHTML = htmlContent;

    } catch (err) {
        scoreCircle.textContent = 'Err';
        scoreDesc.textContent = 'Gagal memproses.';
        feedbackBox.textContent = 'Terjadi Kesalahan: ' + err.message;
        paperPreview.innerHTML = `<div style="color:red; padding:20px;">Gagal memuat preview: ${err.message}</div>`;
    }
}

function copyCoverLetter() {
    const text = document.getElementById('cover-letter-box').textContent;
    if (!text || text.includes('Menyiapkan draft')) {
        return alert('Belum ada Cover Letter yang digenerate!');
    }
    navigator.clipboard.writeText(text).then(() => {
        alert('Cover Letter / Body Email berhasil disalin ke clipboard! 📋');
    }).catch(err => {
        alert('Gagal menyalin teks: ' + err);
    });
}

function toggleLiveEdit() {
    const paper = document.getElementById('cv-paper-preview');
    const btn = document.getElementById('btn-toggle-edit');
    const editables = paper.querySelectorAll('h1, .cv-title-role, .cv-contact, p, span');
    
    const isEditing = paper.classList.toggle('editable-mode');
    
    editables.forEach(el => {
        el.setAttribute('contenteditable', isEditing ? 'true' : 'false');
    });

    if (isEditing) {
        btn.textContent = 'Selesai Edit ✅';
        btn.style.background = '#10b981';
        btn.style.color = '#fff';
    } else {
        btn.textContent = 'Aktifkan Mode Edit ✍️';
        btn.style.background = '#374151';
        btn.style.color = '#f3f4f6';
        alert('Perubahan berhasil disimpan pada preview!');
    }
}

function exportToPDF() {
    const paper = document.getElementById('cv-paper-preview');
    if (paper.classList.contains('editable-mode')) {
        toggleLiveEdit();
    }
    window.print();
}
