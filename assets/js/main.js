

import { GoogleGenAI, Type } from '@google/genai';

document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    const initializeApp = () => {
        loginPage.style.display = 'none';
        appContainer.style.display = 'block';

        const page = new URLSearchParams(window.location.search).get('page') || 'main';
        const mainPage = document.getElementById('main-page');
        const setupPage = document.getElementById('setup-page');
        const navMain = document.getElementById('nav-main');
        const navSetup = document.getElementById('nav-setup');
        const logoutBtn = document.getElementById('logout-btn');

        const setActiveNav = (active) => {
            const links = { main: navMain, setup: navSetup };
            Object.entries(links).forEach(([key, link]) => {
                if (link) {
                    if (key === active) {
                        link.classList.add('bg-slate-800', 'text-white');
                        link.classList.remove('text-slate-400');
                    } else {
                        link.classList.remove('bg-slate-800', 'text-white');
                        link.classList.add('text-slate-400');
                    }
                }
            });
        };
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('isLoggedIn');
                window.location.reload();
            });
        }

        if (page === 'setup') {
            if (mainPage) mainPage.style.display = 'none';
            if (setupPage) setupPage.style.display = 'block';
            setActiveNav('setup');
            
            const setupApp = new SetupApp();
            setupApp.init();
        } else { // 'main'
            if (mainPage) mainPage.style.display = 'block';
            if (setupPage) setupPage.style.display = 'none';
            setActiveNav('main');
            
            const mainApp = new MainApp();
            mainApp.init();
        }
    };

    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        initializeApp();
    } else {
        loginPage.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        // Simple hardcoded credentials
        if (username === 'admin' && password === 'admin') {
            sessionStorage.setItem('isLoggedIn', 'true');
            initializeApp();
        } else {
            loginError.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng.';
            loginError.style.display = 'block';
        }
    });
});


class ConfigManager {
    constructor() {
        this.configKey = 'appConfig';
        this.defaultConfig = {
            geminiApiKey: '',
            openaiApiKey: '',
            openaiModel: 'gpt-4-turbo',
            prompts: {
                outline: 'Dựa vào nội dung này ..., hãy tạo cho tôi 1 dàn ý nội dung gồm 10 phần. Lưu ý: kịch bản sẽ cho video tiktok nên đoạn đầu tiên cần hấp dẫn, có nhiều câu hỏi, có nhiều bí ẩn, có nhiều plot-twist để giữ chân người dùng. Hiển thị kết quả theo cấu trúc sau:\n[Tên phần]: Nội dung chính; Thời gian; Câu mở đầu; Câu kết thúc;',
                intro: 'Dựa vào ý này: "..." và kết hợp với nội dung gốc. Hãy viết cho tôi đoạn mở đầu hấp dẫn. Viết bằng tiếng Việt. Đoạn này có độ dài không quá 200 chữ theo cách đếm của google docs.',
                content: 'Dựa vào ý này: "..." và kết hợp với nội dung gốc. Hãy viết cho tôi đoạn tiếp theo liền kết với đoạn trên. Viết bằng tiếng Việt. Đoạn này có độ dài không quá 200 chữ theo cách đếm của google docs.',
                seo: 'Dựa vào tiêu đề video cung cấp, hãy thực hiện các yêu cầu sau và trả về kết quả dưới dạng một đối tượng JSON duy nhất:\n1. Tạo một tiêu đề video mới (sử dụng key "title"), tối ưu SEO, không quá 70 ký tự.\n2. Viết một mô tả video YouTube (sử dụng key "description") dài khoảng 100 từ bằng tiếng Indonesia, trong đó có chứa các từ "CHỮA LÀNH" và "NIỀM TIN".\n3. Đề xuất 10 từ khóa (sử dụng key "keywords"), mỗi từ khóa nên là một cụm từ ngắn.\n\nTiêu đề video gốc là:',
                videoPrompt: 'Dựa vào kịch bản sau: "...", hãy gợi ý cho tôi 80 prompt tương ứng với 80 scence phía trên. 80 prompt này sẽ được dùng để tạo video trên các nền tảng AI như Midjourney, Heygen. 80 prompt này phải ở dạng [Shot type] of [Scene/Motion], [lighting & Mood], [Camera movement], [Style/Detail level] để dễ dàng copy-paste vào các ứng dụng tạo video vvv2.\nVideo cần có người, hãy luôn luôn có gương mặt giống người việt nam. Video cần đồng nhất tổng màu, trong đó có mã số #.... Video cần thể hiện sự đơn giản, hợp lý. Loại bỏ tất cả các cảnh phim không cần thiết. Video full frame, no black bars, no letterbox. Hiển thị prompt rành mạch dạng dòng, không có số thứ tự.\nToànk cảnh từ ngữ vi phạm khi dùng vvv2. Chỉ hiển thị tiếng anh cho tôi.'
            },
            otherApis: [],
        };
        this.config = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.configKey);
            const parsed = saved ? JSON.parse(saved) : this.defaultConfig;
            // Ensure config structure is up-to-date
            return {...this.defaultConfig, ...parsed, prompts: {...this.defaultConfig.prompts, ...(parsed.prompts || {})}};
        } catch (e) {
            console.error("Failed to load config from localStorage", e);
            return this.defaultConfig;
        }
    }

    save() {
        try {
            localStorage.setItem(this.configKey, JSON.stringify(this.config));
        } catch (e) {
            console.error("Failed to save config to localStorage", e);
        }
    }

    get() {
        return this.config;
    }

    set(newConfig) {
        this.config = newConfig;
        this.save();
    }
}

const configManager = new ConfigManager();

class SetupApp {
    constructor() {
        this.form = document.getElementById('setup-form');
        this.otherApisContainer = document.getElementById('other-apis-container');
        this.addOtherApiBtn = document.getElementById('add-other-api-btn');
    }

    init() {
        this.loadConfigIntoForm();
        this.bindEvents();
    }

    loadConfigIntoForm() {
        const config = configManager.get();
        // API Keys
        document.getElementById('gemini-api-key').value = config.geminiApiKey || '';
        document.getElementById('openai-api-key').value = config.openaiApiKey || '';
        document.getElementById('openai-model').value = config.openaiModel || 'gpt-4-turbo';
        // Prompts
        document.getElementById('prompt-outline').value = config.prompts.outline || '';
        document.getElementById('prompt-intro').value = config.prompts.intro || '';
        document.getElementById('prompt-content').value = config.prompts.content || '';
        document.getElementById('prompt-seo').value = config.prompts.seo || '';
        document.getElementById('prompt-videoPrompt').value = config.prompts.videoPrompt || '';
        // Other APIs
        this.renderOtherApis();
    }

    renderOtherApis() {
        const config = configManager.get();
        this.otherApisContainer.innerHTML = '';
        if (config.otherApis && config.otherApis.length > 0) {
            config.otherApis.forEach(api => this.addOtherApiInput(api));
        }
    }

    addOtherApiInput(api) {
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2';
        div.innerHTML = `
            <input
                type="text"
                value="${api.key}"
                data-id="${api.id}"
                placeholder="API Key"
                class="flex-grow w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 other-api-key"
            />
            <button type="button" data-id="${api.id}" class="text-red-500 hover:text-red-700 remove-other-api-btn">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
            </button>
        `;
        this.otherApisContainer.appendChild(div);
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });

        this.addOtherApiBtn.addEventListener('click', () => {
            const config = configManager.get();
            const newApi = { id: `api-${Date.now()}`, key: '' };
            config.otherApis.push(newApi);
            configManager.set(config);
            this.addOtherApiInput(newApi);
        });

        this.otherApisContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.remove-other-api-btn');
            if (button) {
                const id = button.dataset.id;
                const config = configManager.get();
                config.otherApis = config.otherApis.filter(api => api.id !== id);
                configManager.set(config);
                this.renderOtherApis();
            }
        });
    }

    saveConfig() {
        const newConfig = configManager.get();
        // API Keys
        newConfig.geminiApiKey = document.getElementById('gemini-api-key').value;
        newConfig.openaiApiKey = document.getElementById('openai-api-key').value;
        newConfig.openaiModel = document.getElementById('openai-model').value;
        // Prompts
        newConfig.prompts.outline = document.getElementById('prompt-outline').value;
        newConfig.prompts.intro = document.getElementById('prompt-intro').value;
        newConfig.prompts.content = document.getElementById('prompt-content').value;
        newConfig.prompts.seo = document.getElementById('prompt-seo').value;
        newConfig.prompts.videoPrompt = document.getElementById('prompt-videoPrompt').value;
        // Other APIs
        const apiInputs = this.otherApisContainer.querySelectorAll('.other-api-key');
        const updatedApis = [];
        apiInputs.forEach(input => {
            updatedApis.push({ id: input.dataset.id, key: input.value });
        });
        newConfig.otherApis = updatedApis;
        
        configManager.set(newConfig);
        alert('Cấu hình đã được lưu!');
    }
}

class MainApp {
    constructor() {
        this.jobs = [];
        this.jobStatus = {
            WAITING: 'Chờ',
            PROCESSING: 'Đang làm',
            COMPLETED: 'Hoàn tất',
            ERROR: 'Lỗi',
        };
        this.config = configManager.get();
        this.ai = null; // Will be initialized in init()

        // DOM elements
        this.addJobForm = document.getElementById('add-job-form');
        this.formError = document.getElementById('form-error');
        this.jobsTableBody = document.getElementById('jobs-table-body');
        this.jobRowTemplate = document.getElementById('job-row-template');
        this.runAllBtn = document.getElementById('run-all-btn');
        this.deleteAllBtn = document.getElementById('delete-all-btn');
        this.downloadAllCompletedBtn = document.getElementById('download-all-completed-btn');
    }

    init() {
        if (!this.config.geminiApiKey && !this.config.openaiApiKey) {
            this.disableApp("Vui lòng nhập Gemini hoặc OpenAI API Key trong trang Cài đặt để sử dụng ứng dụng.");
        } else {
            if (this.config.geminiApiKey) {
                try {
                    this.ai = new GoogleGenAI({ apiKey: this.config.geminiApiKey });
                } catch (error) {
                    this.disableApp("Cấu trúc API Key Gemini không hợp lệ. Vui lòng kiểm tra lại trong trang Cài đặt.");
                    console.error("Gemini AI Initialization Error:", error);
                    return;
                }
            }
            this.bindEvents();
        }
    }

    disableApp(message) {
        this.addJobForm.querySelector('button[type="submit"]').disabled = true;
        this.runAllBtn.disabled = true;
        this.deleteAllBtn.disabled = true;
        this.downloadAllCompletedBtn.disabled = true;
        
        const formContainer = this.addJobForm.closest('.bg-slate-900');
        formContainer.style.opacity = '0.6';
        formContainer.style.pointerEvents = 'none';

        const jobsTableContainer = this.jobsTableBody.closest('.bg-slate-900');
        jobsTableContainer.style.opacity = '0.6';

        const alertDiv = document.createElement('div');
        alertDiv.className = 'bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 mb-6 rounded-lg shadow-md';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <p class="font-bold">Cần cấu hình API Key</p>
            <p>${message} <a href="?page=setup" class="font-semibold underline hover:text-yellow-200">Đi đến trang Cài đặt</a>.</p>
        `;
        const mainPage = document.getElementById('main-page');
        if (mainPage) {
            mainPage.insertBefore(alertDiv, mainPage.firstChild);
        }
    }

    showGlobalError(message) {
        const existingError = document.getElementById('global-error-alert');
        if (existingError) existingError.remove();

        const alertDiv = document.createElement('div');
        alertDiv.id = 'global-error-alert';
        alertDiv.className = 'bg-red-900/50 border border-red-700 text-red-300 p-4 mb-6 rounded-lg shadow-md flex justify-between items-center';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <div>
                <p class="font-bold">Lỗi API</p>
                <p>${message} <a href="?page=setup" class="font-semibold underline hover:text-red-200">Đi đến trang Cài đặt để cập nhật</a>.</p>
            </div>
            <button class="text-red-400 hover:text-red-300 font-bold text-2xl p-2 -mr-2 -mt-2">&times;</button>
        `;
        const mainPage = document.getElementById('main-page');
        if (mainPage) {
            mainPage.insertBefore(alertDiv, mainPage.firstChild);
            alertDiv.querySelector('button').addEventListener('click', () => {
                alertDiv.remove();
            });
        }
    }

    parseApiError(error) {
        const message = error.message || '';

        // Gemini errors
        if (message.includes("API key expired")) {
            return "API Key Gemini của bạn đã hết hạn.";
        }
        if (message.includes("API_KEY_INVALID")) {
            return "API Key Gemini không hợp lệ hoặc đã bị thu hồi.";
        }

        // OpenAI errors
        if (message.toLowerCase().includes("incorrect api key")) {
            return "API Key OpenAI không hợp lệ.";
        }
        if (message.toLowerCase().includes("quota")) {
            return "Bạn đã hết dung lượng (quota) OpenAI API.";
        }
        
        try {
            if (message.includes('Google AI')) {
                const jsonString = message.substring(message.indexOf('{'));
                const errorObj = JSON.parse(jsonString);
                if (errorObj.error && errorObj.error.message) {
                    return `Lỗi từ Google AI: ${errorObj.error.message}`;
                }
            }
        } catch (e) {
            // Ignore parsing errors
        }
        return message; // Fallback to original message
    }
    
    bindEvents() {
        this.addJobForm.addEventListener('submit', this.handleAddJob.bind(this));
        this.jobsTableBody.addEventListener('click', this.handleTableActions.bind(this));
        this.runAllBtn.addEventListener('click', this.handleRunAll.bind(this));
        this.deleteAllBtn.addEventListener('click', this.handleDeleteAll.bind(this));
        this.downloadAllCompletedBtn.addEventListener('click', this.handleDownloadAllCompletedJobs.bind(this));
    }

    async callAiApi(jobId, payload) {
        if (this.config.geminiApiKey && this.ai) {
            return this.callGeminiApi(jobId, payload);
        } else if (this.config.openaiApiKey) {
            return this.callOpenAiApi(jobId, payload);
        } else {
            throw new Error("Không có API key nào được cấu hình.");
        }
    }

    async callOpenAiApi(jobId, payload) {
        const MAX_RETRIES = 3;
        const INITIAL_BACKOFF_MS = 2000;
        let retries = 0;

        const job = this.findJob(jobId);
        const originalProgressMessage = job ? job.progressMessage : '';
        const { prompt, isJson } = payload;

        const messages = [{ role: "user", content: prompt }];
        if (isJson) {
            messages.unshift({
                role: "system",
                content: "You are a helpful assistant designed to output JSON. Please ensure your response is a single, valid JSON object and nothing else."
            });
        }
        
        const body = {
            model: this.config.openaiModel || "gpt-4-turbo",
            messages: messages,
        };

        if (isJson) {
            body.response_format = { type: "json_object" };
        }

        while (true) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.openaiApiKey}`
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error ? errorData.error.message : `Lỗi HTTP: ${response.status} ${response.statusText}`;
                    const customError = new Error(errorMessage);
                    customError.isRetryable = response.status === 429 || response.status >= 500;
                    throw customError;
                }
                
                const data = await response.json();
                const content = data.choices[0].message.content;

                if (retries > 0) {
                     this.updateJobState(jobId, { progressMessage: originalProgressMessage });
                }
                return { text: content };

            } catch (error) {
                console.error(`OpenAI API call failed (attempt ${retries + 1}):`, error.message);
                retries++;
                if (error.isRetryable && retries < MAX_RETRIES) {
                    const delay = INITIAL_BACKOFF_MS * Math.pow(2, retries - 1);
                    const retryMessage = `${originalProgressMessage} (API quá tải, thử lại sau ${delay / 1000}s...)`;
                    this.updateJobState(jobId, { progressMessage: retryMessage });
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }
    }
    
    async callGeminiApi(jobId, payload) {
        const MAX_RETRIES = 3;
        const INITIAL_BACKOFF_MS = 2000;
        let retries = 0;
        
        const job = this.findJob(jobId);
        const originalProgressMessage = job ? job.progressMessage : '';

        while (true) {
            try {
                if (!this.ai) throw new Error("Gemini AI client not initialized.");

                const { prompt, isJson, jsonSchema } = payload;
                const config = {};
                if (isJson) {
                    config.responseMimeType = "application/json";
                    config.responseSchema = jsonSchema;
                }
                const response = await this.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config,
                });

                if (retries > 0) {
                    this.updateJobState(jobId, { progressMessage: originalProgressMessage });
                }
                return response;
            } catch (error) {
                console.error(`Gemini API call failed for (attempt ${retries + 1}):`, error);
                
                retries++;

                const isRetryable = error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'));

                if (isRetryable && retries < MAX_RETRIES) {
                    const delay = INITIAL_BACKOFF_MS * Math.pow(2, retries - 1);
                    const retryMessage = `${originalProgressMessage} (API quá tải, thử lại sau ${delay / 1000}s...)`;
                    this.updateJobState(jobId, { progressMessage: retryMessage });
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }
    }

    showError(message) {
        this.formError.textContent = message;
        this.formError.style.display = message ? 'block' : 'none';
    }

    handleAddJob(e) {
        e.preventDefault();
        const titleInput = document.getElementById('title');
        const videoCodeInput = document.getElementById('video-code');
        const youtubeLinkInput = document.getElementById('youtubeLink');
        const scriptContentInput = document.getElementById('script-content');

        if (!videoCodeInput.value) {
            this.showError('Vui lòng nhập mã video.');
            return;
        }
        if (!titleInput.value) {
            this.showError('Vui lòng nhập tiêu đề cho video.');
            return;
        }
        if (!scriptContentInput.value) {
            this.showError('Vui lòng dán nội dung kịch bản.');
            return;
        }
        this.showError('');
        
        const newJob = {
            id: `${videoCodeInput.value.trim()}-${Date.now()}`,
            title: titleInput.value.trim(),
            videoCode: videoCodeInput.value.trim(),
            youtubeLink: youtubeLinkInput.value.trim(),
            userScript: scriptContentInput.value.trim(),
            status: this.jobStatus.WAITING,
            progress: 0,
            progressMessage: 'Sẵn sàng',
        };

        this.jobs.unshift(newJob);
        this.renderJobs();

        // Reset form
        this.addJobForm.reset();
    }

    handleTableActions(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;
        const jobId = target.dataset.id;
        
        if (!action || !jobId) return;

        switch(action) {
            case 'run': this.handleRunJob(jobId); break;
            case 'delete': this.handleDeleteJob(jobId); break;
            case 'download-all': this.handleDownloadAllForJob(jobId); break;
            case 'download-content': this.handleDownload(jobId, 'content'); break;
            case 'download-seo': this.handleDownload(jobId, 'seo'); break;
            case 'download-videoPrompt': this.handleDownload(jobId, 'videoPrompt'); break;
            case 'download-thumbnail': this.handleDownload(jobId, 'thumbnail'); break;
        }
    }
    
    handleRunJob(jobId) {
        const jobToRun = this.jobs.find(j => j.id === jobId);
        if (jobToRun) {
          this.processJob(jobToRun);
        }
    }

    handleRunAll() {
        const waitingJobs = this.jobs.filter(job => job.status === this.jobStatus.WAITING);
        waitingJobs.forEach(job => this.processJob(job));
    }
    
    handleDeleteJob(jobId) {
        this.jobs = this.jobs.filter(j => j.id !== jobId);
        this.renderJobs();
    }
    
    handleDeleteAll() {
        this.jobs = [];
        this.renderJobs();
    }
    
    findJob(jobId) {
        return this.jobs.find(j => j.id === jobId);
    }
    
    handleDownload(jobId, fileType) {
        const job = this.findJob(jobId);
        if (!job || !job.output) return;
        
        const { videoCode, output } = job;
        const fileUtils = new FileUtils();

        switch (fileType) {
            case 'content':
                fileUtils.downloadFile(`${videoCode}_content.txt`, output.content, 'text/plain');
                break;
            case 'seo':
                fileUtils.downloadFile(`${videoCode}_seo.txt`, output.seo, 'text/plain');
                break;
            case 'videoPrompt':
                fileUtils.downloadFile(`${videoCode}_prom_video.txt`, output.videoPrompt, 'text/plain');
                break;
            case 'thumbnail':
                if (output.thumbnail) {
                    fileUtils.downloadFile(`${videoCode}_thumbnail.jpg`, output.thumbnail, 'image/jpeg', true);
                }
                break;
        }
    }

    handleDownloadAllForJob(jobId) {
        const job = this.findJob(jobId);
        if (!job || !job.output) return;
        const { videoCode, output } = job;
        const fileUtils = new FileUtils();

        const filesToZip = [
            { name: `${videoCode}-content.txt`, content: output.content },
            { name: `${videoCode}-seo.txt`, content: output.seo },
            { name: `${videoCode}-prom_video.txt`, content: output.videoPrompt },
        ];

        if (output.thumbnail && output.thumbnail.length > 0) {
            filesToZip.push({ name: `${videoCode}-thumbnail.jpg`, content: output.thumbnail, isBase64: true });
        }

        fileUtils.zipAndDownloadFiles(videoCode, filesToZip);
    }

    handleDownloadAllCompletedJobs() {
        const completedJobs = this.jobs.filter(job => job.status === this.jobStatus.COMPLETED && job.output);
        if (completedJobs.length === 0) {
            alert('Không có công việc hoàn thành nào để tải xuống.');
            return;
        }

        const filesToZip = [];
        completedJobs.forEach(job => {
            const { videoCode, output } = job;
            const folder = `${videoCode}/`;
            filesToZip.push({ name: `${folder}${videoCode}-content.txt`, content: output.content });
            filesToZip.push({ name: `${folder}${videoCode}-seo.txt`, content: output.seo });
            filesToZip.push({ name: `${folder}${videoCode}-prom_video.txt`, content: output.videoPrompt });
             if (output.thumbnail && output.thumbnail.length > 0) {
                filesToZip.push({ name: `${folder}${videoCode}-thumbnail.jpg`, content: output.thumbnail, isBase64: true });
            }
        });

        const fileUtils = new FileUtils();
        fileUtils.zipAndDownloadFiles('All_Completed_Jobs', filesToZip);
    }

    updateJobState(id, updates) {
        const jobIndex = this.jobs.findIndex(job => job.id === id);
        if (jobIndex !== -1) {
            this.jobs[jobIndex] = { ...this.jobs[jobIndex], ...updates };
            this.updateJobUI(this.jobs[jobIndex]);
        }
    }

    updateJobUI(job) {
        const row = document.querySelector(`tr[data-id='${job.id}']`);
        if (!row) return;

        // Status Badge
        const statusCell = row.querySelector('.job-status');
        const statusClasses = {
            [this.jobStatus.WAITING]: 'bg-slate-600 text-slate-200',
            [this.jobStatus.PROCESSING]: 'bg-blue-500 text-white animate-pulse',
            [this.jobStatus.COMPLETED]: 'bg-green-500 text-white',
            [this.jobStatus.ERROR]: 'bg-red-500 text-white',
        };
        statusCell.innerHTML = `<span class="px-3 py-1 text-xs font-semibold rounded-full ${statusClasses[job.status]}">${job.status}</span>`;
        
        // Progress Message
        const messageEl = row.querySelector('.progress-message');
        messageEl.textContent = job.progressMessage;
        messageEl.title = job.status === this.jobStatus.ERROR ? job.error : job.progressMessage;
        if(job.status === this.jobStatus.ERROR){
            messageEl.innerHTML = `<span class="text-red-400 font-semibold">${job.error}</span>`;
        } else {
             messageEl.innerHTML = job.progressMessage;
        }

        // Progress Bar
        const progressBarContainer = row.querySelector('.progress-bar-container');
        const progressBar = row.querySelector('.progress-bar');
        if (job.status === this.jobStatus.PROCESSING || job.status === this.jobStatus.COMPLETED) {
            progressBarContainer.style.display = 'block';
            progressBar.style.width = `${Math.round(job.progress * 100)}%`;
        } else {
            progressBarContainer.style.display = 'none';
        }
        
        // Actions
        const actionsCell = row.querySelector('.job-actions');
        actionsCell.innerHTML = this.renderActionButtons(job);
        this.bindDropdownEvents(row);
    }
    
    renderJobs() {
        this.jobsTableBody.innerHTML = '';
        if (this.jobs.length === 0) {
            this.jobsTableBody.innerHTML = `
                <tr class="border-b border-slate-700">
                    <td colspan="5" class="px-6 py-10 text-center text-slate-400">
                        Chưa có công việc nào. Hãy thêm video mới ở trên.
                    </td>
                </tr>
            `;
            return;
        }

        this.jobs.forEach(job => {
            const clone = this.jobRowTemplate.content.cloneNode(true);
            const row = clone.querySelector('tr');
            row.dataset.id = job.id;
            row.querySelector('.video-code').textContent = job.videoCode;
            row.querySelector('.job-title').textContent = job.title;
            row.querySelector('.job-title').title = job.title;
            
            this.jobsTableBody.appendChild(clone);
            this.updateJobUI(job);
        });
    }

    renderActionButtons(job) {
        if (job.status === this.jobStatus.COMPLETED && job.output) {
            const hasThumbnail = job.output.thumbnail && job.output.thumbnail.length > 0;
            const thumbnailBtn = hasThumbnail ? `
                <button data-action="download-thumbnail" data-id="${job.id}" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg><span>Thumbnail (.jpg)</span></button>
            ` : '';

            return `
                <div class="flex items-center justify-end gap-2">
                    <div class="relative dropdown-container">
                        <button data-action="toggle-dropdown" data-id="${job.id}" class="flex items-center gap-1 bg-slate-700 px-3 py-2 rounded-md text-sm hover:bg-slate-600 transition-colors">
                            Tải xuống <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                        </button>
                        <div class="dropdown-menu absolute top-full right-0 mt-2 w-56 bg-slate-800 rounded-md shadow-lg z-10 border border-slate-700 overflow-hidden">
                            <button data-action="download-all" data-id="${job.id}" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors border-b border-slate-700"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd" /></svg><span>Tải xuống tất cả (.zip)</span></button>
                            <button data-action="download-content" data-id="${job.id}" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg><span>Kịch bản (.txt)</span></button>
                            <button data-action="download-seo" data-id="${job.id}" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A1 1 0 012 10V5a1 1 0 011-1h5a1 1 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg><span>SEO (.txt)</span></button>
                            <button data-action="download-videoPrompt" data-id="${job.id}" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm2 2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H6zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1h-2zM6 11a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H6zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2z" clip-rule="evenodd" /></svg><span>Prompt Video (.txt)</span></button>
                            ${thumbnailBtn}
                        </div>
                    </div>
                    <button data-action="delete" data-id="${job.id}" title="Xóa" class="p-2 text-red-400 hover:text-red-300 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                </div>
            `;
        }
        
        const isProcessing = job.status === this.jobStatus.PROCESSING || job.status === this.jobStatus.COMPLETED;
        return `
            <div class="flex items-center justify-end gap-2">
                <button data-action="run" data-id="${job.id}" ${isProcessing ? 'disabled' : ''} title="Chạy" class="p-2 text-green-400 hover:text-green-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
                </button>
                <button data-action="delete" data-id="${job.id}" ${job.status === this.jobStatus.PROCESSING ? 'disabled' : ''} title="Xóa" class="p-2 text-red-400 hover:text-red-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                </button>
            </div>
        `;
    }

    bindDropdownEvents(scope) {
        scope.querySelectorAll('button[data-action="toggle-dropdown"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const container = e.currentTarget.closest('.dropdown-container');
                const menu = container.querySelector('.dropdown-menu');
                menu.classList.toggle('show');
            });
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
            }
        });
    }

    // --- Main Job Processing Logic ---
    async processJob(job) {
        const totalSteps = 14;
        const { prompts } = this.config;

        const getText = (response) => {
            return response?.text?.replace(/^##\s*(.*?)\s*##/gm, '$1').replace(/##/g, '').trim() || '';
        };

        const getJson = (text) => {
             const cleanJson = text.trim().replace(/^```(json)?\s*|```$/g, '');
             return JSON.parse(cleanJson);
        }

        try {
            this.updateJobState(job.id, { status: this.jobStatus.PROCESSING, progress: 0, progressMessage: 'Bắt đầu...' });
            
            // Step 1: Outline
            this.updateJobState(job.id, { progress: 1/totalSteps, progressMessage: `1/${totalSteps}: Đang tạo dàn ý...` });
            const outlinePrompt = prompts.outline.replace('...', `\`\`\`\n${job.userScript}\n\`\`\``);
            const outlineSchema = { type: Type.ARRAY, items: { type: Type.STRING } };
            const outlineResponse = await this.callAiApi(job.id, { prompt: outlinePrompt, isJson: true, jsonSchema: outlineSchema });
            
            const outlineText = getText(outlineResponse);
            let rawOutline;
            try {
                rawOutline = getJson(outlineText);
            } catch (e) {
                console.error("Failed to parse outline JSON:", outlineText, e);
                throw new Error("Không thể phân tích dàn ý. Dữ liệu trả về không phải là JSON hợp lệ.");
            }

            const convertOutlineToArray = (data) => {
                let sourceArray;

                if (Array.isArray(data)) {
                    sourceArray = data;
                } else if (typeof data === 'object' && data !== null) {
                    // Try to find an array property in the object
                    sourceArray = Object.values(data).find(value => Array.isArray(value));
                    // If no array found, use the object's values as the array
                    if (!sourceArray) {
                        sourceArray = Object.values(data);
                    }
                } else {
                    return null; // Input is not an array or object
                }

                if (!sourceArray || sourceArray.length === 0) {
                    return null;
                }
                
                // Ensure all items in the array are strings
                return sourceArray.map(item => {
                    if (typeof item === 'string') {
                        return item;
                    }
                    if (typeof item === 'object' && item !== null) {
                        // For objects, try to find a meaningful string value
                        const values = Object.values(item);
                        return item.noi_dung_chinh || item.content || item.text || item.title || values.find(v => typeof v === 'string') || values.join('; ');
                    }
                    return String(item || ''); // Convert other types to string
                });
            }

            const outline = convertOutlineToArray(rawOutline);
            
            if (!outline || outline.length < 1) {
                console.error("Invalid outline received:", rawOutline);
                throw new Error("Không thể tạo dàn ý hợp lệ. Dữ liệu trả về không phải là một mảng (array).");
            }

            const scriptParts = [];

            // Step 2: Intro
            this.updateJobState(job.id, { progress: 2/totalSteps, progressMessage: `2/${totalSteps}: Đang viết mở đầu (Phần 1/${outline.length})...` });
            const introFilledPrompt = prompts.intro.replace('...', `"${outline[0]}"`);
            const introFullPrompt = `Đây là kịch bản gốc để tham khảo:\n"""\n${job.userScript}\n"""\n\nHãy thực hiện yêu cầu sau: ${introFilledPrompt}`;
            const introResponse = await this.callAiApi(job.id, { prompt: introFullPrompt });
            scriptParts.push(getText(introResponse));

            // Step 3-11: Content
            for (let i = 1; i < outline.length; i++) {
                const currentProgress = i + 2;
                this.updateJobState(job.id, { progress: currentProgress/totalSteps, progressMessage: `${currentProgress}/${totalSteps}: Đang viết nội dung (Phần ${i + 1}/${outline.length})...` });
                const prevContent = scriptParts.join('\n\n');
                const contentFilled = prompts.content.replace('...', `"${outline[i]}"`);
                const contentFull = `Đây là kịch bản gốc để tham khảo:\n"""\n${job.userScript}\n"""\n\nĐây là nội dung đã được viết cho các phần trước đó:\n"""\n${prevContent}\n"""\n\nHãy thực hiện yêu cầu sau, đảm bảo nội dung mới liền mạch với phần trước: ${contentFilled}`;
                const contentResponse = await this.callAiApi(job.id, { prompt: contentFull });
                scriptParts.push(getText(contentResponse));
            }
            
            const fullScript = `${job.title}\n\n` + outline.map((point, index) => `${point}\n\n${scriptParts[index]}`).join('\n\n');

            // Step 12: SEO
            const seoProgress = totalSteps - 2;
            this.updateJobState(job.id, { progress: seoProgress/totalSteps, progressMessage: `${seoProgress}/${totalSteps}: Đang tạo SEO...` });
            const seoPrompt = `${prompts.seo}\n\n${job.title}`;
            const seoSchema = {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, keywords: { type: Type.ARRAY, items: { type: Type.STRING } } },
                required: ["title", "description", "keywords"]
            };
            const seoResponse = await this.callAiApi(job.id, { prompt: seoPrompt, isJson: true, jsonSchema: seoSchema });
            const seoText = getText(seoResponse);
            let seoResult;
            try {
                seoResult = getJson(seoText);
            } catch (e) {
                console.error("Failed to parse SEO JSON:", seoText, e);
                throw new Error("Không thể phân tích dữ liệu SEO. Dữ liệu trả về không phải là JSON hợp lệ.");
            }

            if (seoResult && seoResult.error) {
                console.error("AI returned an error for SEO task:", seoResult.error);
                throw new Error(`Lỗi từ AI khi tạo SEO: ${seoResult.error}`);
            }

            if (!seoResult || typeof seoResult !== 'object') {
                 console.error("Invalid SEO data received:", seoText);
                 throw new Error("Không thể tạo dữ liệu SEO hợp lệ. Dữ liệu trả về không phải là một đối tượng (object).");
            }
            
            // A more robust way to get a value regardless of key case
            const findValueByKey = (obj, keys) => {
                if (!obj || typeof obj !== 'object') return undefined;
                const lowerCaseKeys = keys.map(k => k.toLowerCase());
                for (const key in obj) {
                    if (lowerCaseKeys.includes(key.toLowerCase())) {
                        return obj[key];
                    }
                }
                return undefined;
            };

            const normalizedSeo = {
                title: findValueByKey(seoResult, ['title', 'new_title', 'newTitle', 'tiêu đề']),
                description: findValueByKey(seoResult, ['description', 'mô tả']),
                keywords: findValueByKey(seoResult, ['keywords', 'tags', 'từ khóa']),
            };


            if (normalizedSeo.keywords && !Array.isArray(normalizedSeo.keywords)) {
                if (typeof normalizedSeo.keywords === 'string') {
                    normalizedSeo.keywords = normalizedSeo.keywords.split(',').map(k => k.trim()).filter(k => k);
                } else {
                     console.warn("Keywords format is not an array or string, cannot process:", normalizedSeo.keywords);
                     normalizedSeo.keywords = [];
                }
            }

            if (!normalizedSeo.title || !normalizedSeo.description || !normalizedSeo.keywords) {
                 console.error("Invalid SEO data received (after normalization):", normalizedSeo);
                 throw new Error("Không thể tạo dữ liệu SEO hợp lệ. Dữ liệu trả về thiếu các trường bắt buộc (title, description, keywords).");
            }
            const seoContent = `${normalizedSeo.title}\n\n${normalizedSeo.description}\n\n${normalizedSeo.keywords.join(', ')}`;


            // Step 13: Video Prompts
            const videoPromptProgress = totalSteps - 1;
            this.updateJobState(job.id, { progress: videoPromptProgress/totalSteps, progressMessage: `${videoPromptProgress}/${totalSteps}: Đang tạo prompt video...` });
            const videoPromptFull = prompts.videoPrompt.replace('...', `\`\`\`\n${fullScript}\n\`\`\``);
            const videoPromptsResponse = await this.callAiApi(job.id, { prompt: videoPromptFull });
            const videoPromptContent = getText(videoPromptsResponse);

            // Step 14: Thumbnail
            this.updateJobState(job.id, { progress: totalSteps/totalSteps, progressMessage: `${totalSteps}/${totalSteps}: Đang lấy thumbnail...` });
            const fileUtils = new FileUtils();
            const videoId = job.youtubeLink ? fileUtils.getYoutubeVideoId(job.youtubeLink) : null;
            let thumbnailBase64 = '';
            if (videoId) {
                try {
                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                    thumbnailBase64 = await fileUtils.fetchImageAsBase64(thumbnailUrl);
                } catch (e) {
                    console.warn("Không thể lấy thumbnail từ YouTube.", e);
                    // Do nothing, thumbnailBase64 will remain empty.
                }
            }

            this.updateJobState(job.id, {
                status: this.jobStatus.COMPLETED,
                progress: 1,
                progressMessage: 'Hoàn thành!',
                output: { content: fullScript, seo: seoContent, videoPrompt: videoPromptContent, thumbnail: thumbnailBase64 }
            });

        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            const friendlyError = this.parseApiError(error);

            if (friendlyError.includes("API Key")) {
                this.showGlobalError(friendlyError);
            }

            const currentJobState = this.findJob(job.id);
            this.updateJobState(job.id, {
                status: this.jobStatus.ERROR,
                error: error.message, // Use the more specific error message from the try-catch blocks
                progressMessage: 'Đã xảy ra lỗi',
                progress: currentJobState ? currentJobState.progress : 0,
            });
        }
    }
}

class FileUtils {
    async loadScript(url) {
        return new Promise((resolve, reject) => {
            if (typeof JSZip !== 'undefined') { // Check if already loaded
                return resolve();
            }
            if (document.querySelector(`script[src="${url}"]`)) {
                 // If script tag exists but library not yet available, wait for it
                 const interval = setInterval(() => {
                    if (typeof JSZip !== 'undefined') {
                        clearInterval(interval);
                        resolve();
                    }
                 }, 100);
                 return;
            }
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Script load error for ${url}`));
            document.head.appendChild(script);
        });
    }

    downloadFile(filename, content, mimeType, isBase64 = false) {
        const blob = isBase64
            ? this.base64ToBlob(content, mimeType)
            : (content instanceof Blob ? content : new Blob([content], { type: mimeType }));
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    getYoutubeVideoId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async fetchImageAsBase64(url) {
        try {
             const response = await fetch(url);
             if (!response.ok) {
                 // Try fallback to hqdefault if maxresdefault fails
                 const fallbackUrl = url.replace('maxresdefault.jpg', 'hqdefault.jpg');
                 const fallbackResponse = await fetch(fallbackUrl);
                 if(!fallbackResponse.ok) {
                    throw new Error(`Failed to fetch image: ${fallbackResponse.statusText}`);
                 }
                 const blob = await fallbackResponse.blob();
                 return this.blobToBase64(blob);
             }
             const blob = await response.blob();
             return this.blobToBase64(blob);
        } catch(e) {
            console.error("Fetch image error", e);
            throw e;
        }
    }

    blobToBase64(blob) {
         return new Promise((resolve, reject) => {
             const reader = new FileReader();
             reader.onloadend = () => {
                 if (typeof reader.result === 'string') {
                     resolve(reader.result.split(',')[1]);
                 } else {
                     reject(new Error('Failed to read blob as base64 string.'));
                 }
             };
             reader.onerror = reject;
             reader.readAsDataURL(blob);
         });
    }

    async zipAndDownloadFiles(zipFileName, files) {
        if (typeof JSZip === 'undefined') {
            try {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            } catch (error) {
                console.error('Failed to load JSZip library', error);
                alert('Could not download files as a zip. A required library failed to load.');
                return;
            }
        }

        const zip = new JSZip();
        files.forEach(file => {
            if (file.isBase64) {
                zip.file(file.name, file.content, { base64: true });
            } else {
                zip.file(file.name, file.content);
            }
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        this.downloadFile(`${zipFileName}.zip`, zipBlob, 'application/zip');
    }
}