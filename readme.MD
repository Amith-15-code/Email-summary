# Email Summary Dashboard

A modern, responsive web application that provides intelligent email summaries with Google Gmail integration, featuring dark/light mode themes and customizable filtering options.

## Features

- 🔐 **Google OAuth Integration**: Secure sign-in with Google Gmail
- 🌙 **Dark/Light Mode**: Toggle between themes with persistent preference
- 📊 **Smart Email Prioritization**: AI-powered priority detection (High, Medium, Low, Spam)
- 📅 **Customizable Time Ranges**: Filter emails by duration (1 day, 7 days, 30 days, 3 months, 1 year)
- ��️ **Visibility Controls**: Filter by read/unread, starred, or all emails
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- �� **Intelligent Summaries**: Automated email summarization and key point extraction
- 📈 **Statistics Dashboard**: Overview of email metrics and counts

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add your domain to "Authorized JavaScript origins"
   - Download the credentials JSON file

### 2. Configure the Application

1. Open `script.js`
2. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Google Client ID from step 1
3. Update the authorized domains in your Google Cloud Console to match your hosting domain

### 3. Hosting

You can host this application on:
- GitHub Pages
- Netlify
- Vercel
- Any static web hosting service

### 4. Local Development

For local development, you can use a simple HTTP server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Usage

1. **Sign In**: Click "Sign in with Google" and authorize the application
2. **View Emails**: Your emails will automatically load and be summarized
3. **Filter**: Use the filter controls to customize your email view:
   - **Time Range**: Select how far back to look for emails
   - **Priority**: Filter by email importance level
   - **Visibility**: Show only unread, read, starred, or all emails
4. **View Details**: Click on any email to see the full summary and key points
5. **Toggle Theme**: Use the sun/moon icon to switch between dark and light modes

## Email Priority Algorithm

The application uses an intelligent priority system:

- **High Priority**: Important label, urgent keywords, or marked as important
- **Medium Priority**: Regular emails without special indicators
- **Low Priority**: Promotional emails, newsletters, and marketing content
- **Spam**: Emails marked as spam by Gmail

## Customization

### Adding New Filters

To add new filter options, modify the HTML in `index.html` and add corresponding logic in `script.js`.

### Styling

The CSS uses CSS custom properties (variables) for easy theming. Modify the `:root` and `[data-theme="dark"]` sections in `styles.css` to customize colors.

### Email Processing

The `processEmail()` function in `script.js` can be enhanced to include more sophisticated AI processing for better summaries and priority detection.

## Security Notes

- The application only requests read-only access to Gmail
- No email content is stored on external servers
- All processing happens client-side
- OAuth tokens are handled securely by Google's libraries

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests!