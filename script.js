// Gmail API configuration
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual client ID
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

// Global variables
let gapi = window.gapi;
let isSignedIn = false;
let currentTheme = localStorage.getItem('theme') || 'light';
let emails = [];
let filteredEmails = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeEventListeners();
    loadGAPI();
});

// Theme management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (currentTheme === 'light') {
        icon.className = 'fas fa-moon';
    } else {
        icon.className = 'fas fa-sun';
    }
}

// Event listeners
function initializeEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Sign in/out
    document.getElementById('signin-btn').addEventListener('click', handleSignIn);
    document.getElementById('signout-btn').addEventListener('click', handleSignOut);

    // Filters
    document.getElementById('time-filter').addEventListener('change', applyFilters);
    document.getElementById('priority-filter').addEventListener('change', applyFilters);
    document.getElementById('visibility-filter').addEventListener('change', applyFilters);

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', loadEmails);

    // View toggle
    document.getElementById('list-view').addEventListener('click', () => setView('list'));
    document.getElementById('card-view').addEventListener('click', () => setView('card'));

    // Modal
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('email-modal').addEventListener('click', (e) => {
        if (e.target.id === 'email-modal') closeModal();
    });
}

// Google API initialization
function loadGAPI() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            clientId: CLIENT_ID,
            discoveryDocs: [DISCOVERY_DOC],
            scope: SCOPES
        }).then(() => {
            const authInstance = gapi.auth2.getAuthInstance();
            isSignedIn = authInstance.isSignedIn.get();
            
            if (isSignedIn) {
                updateUIForSignedInUser();
                loadEmails();
            } else {
                updateUIForSignedOutUser();
            }
        }).catch(console.error);
    });
}

// Authentication handlers
function handleSignIn() {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signIn().then(() => {
        isSignedIn = true;
        updateUIForSignedInUser();
        loadEmails();
    }).catch(console.error);
}

function handleSignOut() {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signOut().then(() => {
        isSignedIn = false;
        updateUIForSignedOutUser();
        clearEmailData();
    }).catch(console.error);
}

// UI updates
function updateUIForSignedInUser() {
    const authInstance = gapi.auth2.getAuthInstance();
    const user = authInstance.currentUser.get().getBasicProfile();
    
    document.getElementById('signin-btn').classList.add('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-avatar').src = user.getImageUrl();
    document.getElementById('user-name').textContent = user.getName();
}

function updateUIForSignedOutUser() {
    document.getElementById('signin-btn').classList.remove('hidden');
    document.getElementById('user-info').classList.add('hidden');
}

// Email loading and processing
async function loadEmails() {
    if (!isSignedIn) return;

    showLoading(true);
    
    try {
        // Get emails from Gmail API
        const response = await gapi.client.gmail.users.messages.list({
            userId: 'me',
            maxResults: 100,
            q: 'in:inbox'
        });

        const messages = response.result.messages || [];
        const emailPromises = messages.slice(0, 50).map(message => 
            gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full'
            })
        );

        const emailResponses = await Promise.all(emailPromises);
        emails = emailResponses.map(response => processEmail(response.result));
        
        applyFilters();
        updateStats();
        
    } catch (error) {
        console.error('Error loading emails:', error);
        showError('Failed to load emails. Please try again.');
    } finally {
        showLoading(false);
    }
}

function processEmail(message) {
    const headers = message.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const date = new Date(getHeader('Date'));
    const messageId = getHeader('Message-ID');
    
    // Extract email body
    let body = '';
    if (message.payload.body.data) {
        body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (message.payload.parts) {
        body = extractBodyFromParts(message.payload.parts);
    }

    // Determine priority based on content and headers
    const priority = determinePriority(subject, from, body, message);
    
    // Generate AI summary (simplified version)
    const summary = generateSummary(body, subject);
    const keyPoints = extractKeyPoints(body, subject);

    return {
        id: message.id,
        subject,
        from,
        date,
        body,
        summary,
        keyPoints,
        priority,
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED') || false,
        isImportant: message.labelIds?.includes('IMPORTANT') || false,
        isSpam: message.labelIds?.includes('SPAM') || false,
        threadId: message.threadId
    };
}

function extractBodyFromParts(parts) {
    let body = '';
    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
            body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (part.parts) {
            body += extractBodyFromParts(part.parts);
        }
    }
    return body;
}

function determinePriority(subject, from, body, message) {
    // Check if it's spam
    if (message.labelIds?.includes('SPAM')) {
        return 'spam';
    }

    // Check if it's important
    if (message.labelIds?.includes('IMPORTANT')) {
        return 'high';
    }

    // Check for urgent keywords
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'deadline', 'important'];
    const urgentInSubject = urgentKeywords.some(keyword => 
        subject.toLowerCase().includes(keyword)
    );
    const urgentInBody = urgentKeywords.some(keyword => 
        body.toLowerCase().includes(keyword)
    );

    if (urgentInSubject || urgentInBody) {
        return 'high';
    }

    // Check for promotional content
    const promotionalKeywords = ['sale', 'discount', 'offer', 'promotion', 'newsletter'];
    const isPromotional = promotionalKeywords.some(keyword => 
        subject.toLowerCase().includes(keyword) || body.toLowerCase().includes(keyword)
    );

    if (isPromotional) {
        return 'low';
    }

    // Default to medium priority
    return 'medium';
}

function generateSummary(body, subject) {
    // Simplified AI summary generation
    const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 2).join('. ') + '.';
    return summary || 'No summary available for this email.';
}

function extractKeyPoints(body, subject) {
    // Simplified key points extraction
    const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(2, 5).map(s => s.trim()).filter(s => s.length > 0);
}

// Filtering and display
function applyFilters() {
    const timeFilter = parseInt(document.getElementById('time-filter').value);
    const priorityFilter = document.getElementById('priority-filter').value;
    const visibilityFilter = document.getElementById('visibility-filter').value;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);

    filteredEmails = emails.filter(email => {
        // Time filter
        if (email.date < cutoffDate) return false;

        // Priority filter
        if (priorityFilter !== 'all' && email.priority !== priorityFilter) return false;

        // Visibility filter
        if (visibilityFilter === 'unread' && email.isRead) return false;
        if (visibilityFilter === 'read' && !email.isRead) return false;
        if (visibilityFilter === 'starred' && !email.isStarred) return false;

        return true;
    });

    // Sort by priority and date
    filteredEmails.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'spam': 0 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.date) - new Date(a.date);
    });

    displayEmails();
}

function displayEmails() {
    const emailList = document.getElementById('email-list');
    const noEmails = document.getElementById('no-emails');

    if (filteredEmails.length === 0) {
        emailList.innerHTML = '';
        noEmails.classList.remove('hidden');
        return;
    }

    noEmails.classList.add('hidden');
    emailList.innerHTML = filteredEmails.map(email => createEmailElement(email)).join('');
}

function createEmailElement(email) {
    const priorityClass = `priority-${email.priority}`;
    const readClass = email.isRead ? 'read' : 'unread';
    
    return `
        <div class="email-item ${readClass}" onclick="openEmailModal('${email.id}')">
            <div class="email-header">
                <div class="email-meta">
                    <div class="email-subject">${escapeHtml(email.subject)}</div>
                    <div class="email-from">From: ${escapeHtml(email.from)}</div>
                    <div class="email-date">${formatDate(email.date)}</div>
                </div>
                <div class="email-priority ${priorityClass}">${email.priority}</div>
            </div>
            <div class="email-summary">${escapeHtml(email.summary)}</div>
            <ul class="email-keypoints">
                ${email.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
            </ul>
        </div>
    `;
}

function openEmailModal(emailId) {
    const email = filteredEmails.find(e => e.id === emailId);
    if (!email) return;

    document.getElementById('modal-subject').textContent = email.subject;
    document.getElementById('modal-from').textContent = email.from;
    document.getElementById('modal-date').textContent = formatDate(email.date);
    document.getElementById('modal-priority').textContent = email.priority;
    document.getElementById('modal-priority').className = `priority-badge priority-${email.priority}`;
    document.getElementById('modal-summary').textContent = email.summary;
    
    const keyPointsList = document.getElementById('modal-keypoints');
    keyPointsList.innerHTML = email.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('');

    document.getElementById('email-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('email-modal').classList.add('hidden');
}

// Utility functions
function updateStats() {
    const totalEmails = emails.length;
    const unreadEmails = emails.filter(e => !e.isRead).length;
    const importantEmails = emails.filter(e => e.priority === 'high').length;
    const spamEmails = emails.filter(e => e.priority === 'spam').length;

    document.getElementById('total-emails').textContent = totalEmails;
    document.getElementById('unread-emails').textContent = unreadEmails;
    document.getElementById('important-emails').textContent = importantEmails;
    document.getElementById('spam-emails').textContent = spamEmails;
}

function formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showError(message) {
    // Simple error display - you can enhance this with a proper notification system
    alert(message);
}

function clearEmailData() {
    emails = [];
    filteredEmails = [];
    document.getElementById('email-list').innerHTML = '';
    document.getElementById('no-emails').classList.remove('hidden');
    updateStats();
}

function setView(view) {
    const listBtn = document.getElementById('list-view');
    const cardBtn = document.getElementById('card-view');
    const emailList = document.getElementById('email-list');
    
    if (view === 'list') {
        listBtn.classList.add('active');
        cardBtn.classList.remove('active');
        emailList.classList.add('list-view');
        emailList.classList.remove('card-view');
    } else {
        cardBtn.classList.add('active');
        listBtn.classList.remove('active');
        emailList.classList.add('card-view');
        emailList.classList.remove('list-view');
    }
}