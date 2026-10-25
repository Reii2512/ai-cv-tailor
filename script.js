// Konfigurasi Supabase
const SUPABASE_URL = 'https://rnvhxtcecetvhofpqmfp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_toGh6AjVMcFMZl3cPsDPoQ__fooMvq3';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cek status sesi login saat halaman dimuat
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthSession(session);

    supabase.auth.onAuthStateChange((_event, session) => {
        handleAuthSession(session);
    });
});

// Fungsi Navigasi Tampilan UI
function handleAuthSession(session) {
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const userEmailDisplay = document.getElementById('user-email-display');

    if (session) {
        loginView.style.display = 'none';
        dashboardView.style.display = 'flex';
        userEmailDisplay.textContent = session.user.email;
    } else {
        loginView.style.display = 'flex';
        dashboardView.style.display = 'none';
    }
}

// Fungsi Login Google Standar untuk GitHub Pages (HTTPS)
async function loginWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) {
            alert('Gagal Google Login: ' + error.message);
        }
    } catch (err) {
        alert('Terjadi kesalahan sistem: ' + err.message);
    }
}

// Fungsi Logout
async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
}

// Modal API Key Gemini
function openApiKeyModal() {
    document.getElementById('api-modal').style.display = 'flex';
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    document.getElementById('gemini-api-key-input').value = savedKey;
}

function closeApiKeyModal() {
    document.getElementById('api-modal').style.display = 'none';
}

function saveApiKey() {
    const key = document.getElementById('gemini-api-key-input').value.trim();
    if (!key) {
        alert('API Key tidak boleh kosong!');
        return;
    }
    localStorage.setItem('gemini_api_key', key);
    alert('API Key berhasil disimpan di perangkat!');
    closeApiKeyModal();
}

// Engine Utama Pemanggil Gemini API
async function generateCV() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('Mohon masukkan Gemini API Key terlebih dahulu melalui ikon kunci (🔑) di atas!');
        openApiKeyModal();
        return;
    }

    const jobDesc = document.getElementById('job-desc').value.trim();
    const rawData = document.getElementById('user-raw-data').value.trim();

    if (!jobDesc || !rawData) {
        alert('Mohon isi Job Description dan Data Mentah Anda terlebih dahulu!');
        return;
    }

    const outputCard = document.getElementById('output-card');
    const resultBox = document.getElementById('cv-result-content');
    
    outputCard.style.display = 'block';
    resultBox.textContent = 'Sedang meracik CV dengan AI Gemini... Mohon tunggu sebentar ⏳';

    const prompt = `Bertindaklah sebagai profesional HR dan expert pembuat CV. Sesuaikan data mentah kandidat berikut agar sangat relevan dengan Job Description (JD) yang diberikan. Gunakan format profesional (Ringkasan, Pengalaman, Skill, Pendidikan).\n\nJob Description:\n${jobDesc}\n\nData Mentah Kandidat:\n${rawData}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const resData = await response.json();
        
        if (resData.candidates && resData.candidates[0].content) {
            resultBox.textContent = resData.candidates[0].content.parts[0].text;
        } else {
            resultBox.textContent = 'Gagal menghasilkan CV. Periksa kembali Gemini API Key Anda.';
        }
    } catch (err) {
        resultBox.textContent = 'Terjadi kesalahan jaringan: ' + err.message;
    }
}

function copyCV() {
    const text = document.getElementById('cv-result-content').textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('CV berhasil disalin ke clipboard! 📋');
    });
}
