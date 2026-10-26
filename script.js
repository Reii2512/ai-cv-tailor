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

// Navigasi Tab Wizard
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

// Simpan API Key ke LocalStorage sekaligus Sinkronisasi Email & Key ke Supabase Database
async function saveApiKey() {
    const key = document.getElementById('groq-api-key-input').value.trim();
    if (!key) return alert('API Key kosong!');
    
    // Simpan ke localStorage
    localStorage.setItem('groq_api_key', key);

    // Sinkronisasi ke tabel user_profiles di Supabase
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

// SISTEM AUTO-SAVE FORM
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
        jobDesc: document.getElementById('job-desc')?.value || '',
        name: document.getElementById('kinobi-name')?.value || '',
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
            degree: el.querySelector('.edu-degree')?.value || '',
            institution: el.querySelector('.edu-institution')?.value || '',
            start: el.querySelector('.edu-start')?.value || '',
            end: el.querySelector('.edu-end')?.value || ''
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
        if (document.getElementById('job-desc')) document.getElementById('job-desc').value = data.jobDesc || '';
        if (document.getElementById('kinobi-name')) document.getElementById('kinobi-name').value = data.name || '';
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
                        <input type="text" class="exp-title" value="${exp.title}" placeholder="Contoh: Electrical Maintenance Intern">
                    </div>
                    <div class="form-group">
                        <label>Nama Perusahaan / Instansi</label>
                        <input type="text" class="exp-company" value="${exp.company}" placeholder="Contoh: PT Patra SK">
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Mulai</label>
                            <input type="month" class="exp-start" value="${exp.start}">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Selesai</label>
                            <input type="month" class="exp-end" value="${exp.end}">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label>Deskripsi Tugas</label>
                        <textarea class="exp-desc">${exp.desc}</textarea>
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
                        <label>Gelar & Jurusan</label>
                        <input type="text" class="edu-degree" value="${edu.degree}" placeholder="Contoh: Sarjana Terapan">
                    </div>
                    <div class="form-group">
                        <label>Nama Institusi</label>
                        <input type="text" class="edu-institution" value="${edu.institution}" placeholder="Contoh: Politeknik Caltex Riau">
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Tahun Masuk</label>
                            <input type="text" class="edu-start" value="${edu.start}" placeholder="2022">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Tahun Lulus</label>
                            <input type="text" class="edu-end" value="${edu.end}" placeholder="2026">
                        </div>
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
                        <input type="text" class="proj-name" value="${proj.name}" placeholder="Contoh: IoT-Based Smart Poultry">
                    </div>
                    <div class="form-group full-width">
                        <label>Deskripsi & Teknologi</label>
                        <textarea class="proj-desc">${proj.desc}</textarea>
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
            <input type="text" class="exp-title" placeholder="Contoh: Electrical Maintenance Intern">
        </div>
        <div class="form-group">
            <label>Nama Perusahaan / Instansi</label>
            <input type="text" class="exp-company" placeholder="Contoh: PT Patra SK">
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
            <label>Gelar & Jurusan</label>
            <input type="text" class="edu-degree" placeholder="Contoh: Sarjana Terapan - Teknik Elektronika">
        </div>
        <div class="form-group">
            <label>Nama Institusi</label>
            <input type="text" class="edu-institution" placeholder="Contoh: Politeknik Caltex Riau">
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label>Tahun Masuk</label>
                <input type="text" class="edu-start" placeholder="2022">
            </div>
            <div class="form-group" style="flex:1;">
                <label>Tahun Lulus</label>
                <input type="text" class="edu-end" placeholder="2026">
            </div>
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
            <input type="text" class="proj-name" placeholder="Contoh: IoT-Based Smart Poultry">
        </div>
        <div class="form-group full-width">
            <label>Deskripsi & Teknologi</label>
            <textarea class="proj-desc" placeholder="Gunakan ESP32, load cell, dll..."></textarea>
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

// FUNGSI PANGGIL GROQ API (Menggunakan Model qwen/qwen3.8-27b dengan format JSON)
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

// FUNGSI UTAMA: Analisis ATS & Render Tema Pilihan dengan Animasi Loading
async function generateKinobiCV() {
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('Masukkan Groq API Key terlebih dahulu!');
        return openApiKeyModal();
    }

    const selectedTheme = document.querySelector('input[name="cv-theme"]:checked')?.value || 'corporate';
    const cvLanguage = document.getElementById('cv-language')?.value || 'id';
    const jobDesc = document.getElementById('job-desc').value.trim();
    const name = document.getElementById('kinobi-name').value.trim();
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
        const degree = el.querySelector('.edu-degree').value.trim();
        const institution = el.querySelector('.edu-institution').value.trim();
        const start = el.querySelector('.edu-start').value.trim();
        const end = el.querySelector('.edu-end').value.trim();
        
        if (degree || institution) {
            educationsText += `\n[Pendidikan ${index + 1}]
- Gelar/Jurusan: ${degree}
- Institusi: ${institution}
- Tahun: ${start} - ${end}\n`;
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

    scoreCircle.textContent = '...';
    scoreDesc.textContent = 'Menganalisis kecocokan ATS...';
    feedbackBox.textContent = 'Qwen AI sedang menganalisis kecocokan dan mengoptimalkan teks...';
    
    paperPreview.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <span>Qwen AI sedang merancang layout dokumen CV profesional...</span>
        </div>
    `;

    const languageInstruction = cvLanguage === 'en' 
        ? "SELURUH OUTPUT CV (nama section, ringkasan, deskripsi pekerjaan, dll) HARUS DITULIS DALAM BAHASA INGGRIS (ENGLISH) YANG PROFESIONAL." 
        : "SELURUH OUTPUT CV HARUS DITULIS DALAM BAHASA INDONESIA YANG PROFESIONAL.";

    const prompt = `Bertindaklah sebagai Senior HR Recruiter dan Professional Resume Writer. Analisis data kandidat terhadap Job Description berikut dan berikan respons HANYA dalam format JSON murni dengan struktur persis berikut:
{
  "atsScore": "90%",
  "feedback": "Ulasan singkat kelebihan, kekurangan, dan saran perbaikan agar lolos ATS.",
  "fullName": "${name}",
  "professionalTitle": "Judul/Peran Profesional Utama yang Dituju",
  "contactInfo": "${portfolioLink ? 'Portfolio: ' + portfolioLink : 'Kontak Profesional'}",
  "summary": "Ringkasan profesional yang dioptimalkan...",
  "educations": [
    {
      "degree": "Jenjang & Jurusan",
      "institution": "Nama Institusi",
      "period": "Tahun Masuk - Tahun Lulus"
    }
  ],
  "experiences": [
    {
      "title": "Jabatan yang dioptimalkan ATS",
      "company": "Nama Perusahaan",
      "period": "Bulan Tahun - Bulan Tahun",
      "description": "Butir pencapaian tugas profesional yang disesuaikan dengan JD..."
    }
  ],
  "projects": [
    {
      "name": "Nama Proyek",
      "description": "Deskripsi proyek..."
    }
  ],
  "skills": "${skills}"
}

INSTRUKSI BAHASA: ${languageInstruction}

Target Job Description:
${jobDesc}

Data Kandidat:
- Tema Dipilih: ${selectedTheme}
- Nama: ${name}
- Ringkasan: ${summary}
- Riwayat Pendidikan:${educationsText}
- Riwayat Pengalaman Kerja:${experiencesText}
- Daftar Proyek:${projectsText}
- Skill: ${skills}
- Link Portfolio: ${portfolioLink}`;

    try {
        const result = await callGroqAIJSON(apiKey, prompt);
        
        scoreCircle.textContent = result.atsScore || '90%';
        scoreDesc.textContent = 'Analisis dan optimasi ATS selesai.';
        feedbackBox.textContent = result.feedback || 'CV berhasil dioptimalkan sesuai lowongan.';

        paperPreview.className = `cv-paper theme-${selectedTheme}`;

        let htmlContent = `
            <div class="cv-paper-header">
                <h1>${result.fullName || name}</h1>
                <div class="cv-title-role">${result.professionalTitle || 'Professional Candidate'}</div>
                <div class="cv-contact">${result.contactInfo || portfolioLink || ''}</div>
            </div>

            <div class="cv-section-title">${cvLanguage === 'en' ? 'Professional Summary' : 'Ringkasan Profesional'}</div>
            <p>${result.summary || summary}</p>

            <div class="cv-section-title">${cvLanguage === 'en' ? 'Professional Experience / Internships' : 'Pengalaman Kerja / Magang'}</div>
        `;

        if (result.experiences && result.experiences.length > 0) {
            result.experiences.forEach(exp => {
                htmlContent += `
                    <div class="cv-item">
                        <div class="cv-item-header">
                            <span>${exp.title} — <em>${exp.company}</em></span>
                            <span>${exp.period}</span>
                        </div>
                        <p>${exp.description}</p>
                    </div>
                `;
            });
        }

        htmlContent += `<div class="cv-section-title">${cvLanguage === 'en' ? 'Education' : 'Pendidikan'}</div>`;
        if (result.educations && result.educations.length > 0) {
            result.educations.forEach(edu => {
                htmlContent += `
                    <div class="cv-item">
                        <div class="cv-item-header">
                            <span>${edu.degree} — <em>${edu.institution}</em></span>
                            <span>${edu.period}</span>
                        </div>
                    </div>
                `;
            });
        }

        htmlContent += `
            <div class="cv-section-title">${cvLanguage === 'en' ? 'Core Skills' : 'Keahlian Utama (Skills)'}</div>
            <p>${result.skills || skills}</p>
        `;

        if (result.projects && result.projects.length > 0) {
            htmlContent += `<div class="cv-section-title">${cvLanguage === 'en' ? 'Projects & Portfolio' : 'Proyek & Portofolio'}</div>`;
            result.projects.forEach(proj => {
                htmlContent += `
                    <div class="cv-item">
                        <div class="cv-item-header">
                            <span><strong>${proj.name}</strong></span>
                        </div>
                        <p>${proj.description}</p>
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

function copyCV() {
    const paper = document.getElementById('cv-paper-preview');
    if (!paper || !paper.innerText.trim()) return alert('Belum ada isi CV!');
    navigator.clipboard.writeText(paper.innerText).then(() => alert('Teks CV berhasil disalin ke clipboard! 📋'));
}

function exportToPDF() {
    window.print();
}
