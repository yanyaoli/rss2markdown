# RSS to Markdown Converter

This project is a simple application that fetches RSS feeds from specified URLs, converts the content into Markdown format, and displays it in a user-friendly manner. It allows users to preview the converted content and easily copy individual entries.

## Features

- Fetches XML content from multiple RSS feeds based on configuration.
- Converts the fetched XML content into Markdown format.
- Sorts the entries by date for better organization.
- Provides a preview of the Markdown content.
- Supports copying individual Markdown entries for easy sharing.

## Project Structure

```
rss-to-markdown
├── src
│   ├── index.js          # Entry point of the application
│   ├── fetcher.js        # Fetches RSS content
│   ├── converter.js      # Converts XML to Markdown
│   ├── formatter.js      # Formats Markdown output
│   ├── utils
│   │   ├── dateHelper.js # Date handling utilities
│   │   └── xmlParser.js  # Parses XML to JavaScript objects
│   └── config
│       └── default.js    # Default configuration options
├── public
│   ├── css
│   │   └── style.css     # Styles for the application
│   └── js
│       └── app.js        # Frontend JavaScript for user interactions
├── views
│   ├── index.html        # Main HTML page
│   └── partials
│       ├── header.html    # Header partial
│       └── footer.html    # Footer partial
├── package.json          # npm configuration file
├── config.json           # Application configuration options
└── README.md             # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd rss-to-markdown
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Update the `config.json` file with your desired RSS feed URLs.
2. Run the application:
   ```
   npm start
   ```
3. Open your browser and navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.