const express = require("express");
const path = require("path");
const mysql = require('mysql2');
const dotenv = require('dotenv');
const fs = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const htmlToPdf = require('html-pdf');

dotenv.config(); // Load environment variables from .env file

// MySQL database connection setup
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const app = express();
const port = 8000;

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/`);
});

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Route for the rank page
app.get("/", (req, res) => {
    res.render("rank.ejs");
});

// Route for displaying the list of colleges
app.get("/list", (req, res) => {
    const { rank, category, preferredCourse, page = 1 } = req.query;
    const itemsPerPage = 40;
    const offset = (page - 1) * itemsPerPage;

    let courseFilter = '';
    if (preferredCourse === 'IT') {
        courseFilter = `
            'AI Artificial Intelligence',
            'CA CS (AI, Machine Learning)',
            'CY CS- Cyber Security',
            'DS Comp. Sc. Engg- Data Sc.',
            'IO CS- Internet of Things',
            'EV EC Engg(VLSI Design)',
            'CB Comp. Sc. and Bus Sys.',
            'CD Computer Sc. and Design',
            'CF CS(Artificial Intel.)'
        `;
    } else if (preferredCourse === 'EC') {
        courseFilter = `
            'EC Electronics',
            'ET Elec. Telecommn. Engg.',
            'EI Elec. Inst. Engg',
            'MD Med.Elect.',
            'RI Robotics and AI',
            'TI Industrial IoT'
        `;
    } else if (preferredCourse === 'TRENDING') {
        courseFilter = `
            'AI Artificial Intelligence',
            'CA CS (AI, Machine Learning)',
            'CY CS- Cyber Security',
            'DS Comp. Sc. Engg- Data Sc.',
            'IO CS- Internet of Things',
            'EV EC Engg(VLSI Design)',
            'EC Electronics',
            'ET Elec. Telecommn. Engg.',
            'EI Elec. Inst. Engg',
            'MD Med.Elect.',
            'RI Robotics and AI',
            'TI Industrial IoT'
        `;
    }

    // Adjust the SQL queries to set ChanceOfGetting percentages
    let q = `
        SELECT 
            \`College_Name_Not_Found\` AS \`College Name Not Found\`,
            \`Course_Name\` AS \`Course Name\`,
            \`${category}\`,
            90 AS ChanceOfGetting  -- Change 100 to 90 for the first query
        FROM \`2023_1\`
        WHERE CAST(\`${category}\` AS SIGNED) >= ?
        ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
        AND \`${category}\` != '--'
        
        UNION
        
        SELECT 
            \`College_Name_Not_Found\` AS \`College Name Not Found\`,
            \`Course_Name\` AS \`Course Name\`,
            \`${category}\`,
            60 AS ChanceOfGetting  -- Change 50 to 60 for the second query
        FROM \`2023_2\`
        WHERE CAST(\`${category}\` AS SIGNED) >= ?
        ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
        AND \`${category}\` != '--'
        AND NOT EXISTS (
            SELECT 1 FROM \`2023_1\`
            WHERE \`2023_1\`.\`College_Name_Not_Found\` = \`2023_2\`.\`College_Name_Not_Found\`
            AND \`2023_1\`.\`Course_Name\` = \`2023_2\`.\`Course_Name\`
            AND \`2023_1\`.\`${category}\` = \`2023_2\`.\`${category}\`
        )
        
        UNION
        
        SELECT 
            \`College_Name_Not_Found\` AS \`College Name Not Found\`,
            \`Course_Name\` AS \`Course Name\`,
            \`${category}\`,
            30 AS ChanceOfGetting  -- Change 10 to 30 for the third query
        FROM \`2023_3\`
        WHERE CAST(\`${category}\` AS SIGNED) >= ?
        ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
        AND \`${category}\` != '--'
        AND NOT EXISTS (
            SELECT 1 FROM \`2023_1\`
            WHERE \`2023_1\`.\`College_Name_Not_Found\` = \`2023_3\`.\`College_Name_Not_Found\`
            AND \`2023_1\`.\`Course_Name\` = \`2023_3\`.\`Course_Name\`
            AND \`2023_1\`.\`${category}\` = \`2023_3\`.\`${category}\`
        )
        AND NOT EXISTS (
            SELECT 1 FROM \`2023_2\`
            WHERE \`2023_2\`.\`College_Name_Not_Found\` = \`2023_3\`.\`College_Name_Not_Found\`
            AND \`2023_2\`.\`Course_Name\` = \`2023_3\`.\`Course_Name\`
            AND \`2023_2\`.\`${category}\` = \`2023_3\`.\`${category}\`
        )
        ORDER BY CAST(\`${category}\` AS SIGNED) ASC
        LIMIT ${itemsPerPage} OFFSET ${offset}
    `;

    connection.query(q, [rank, rank, rank], (err, results) => {
        if (err) {
            console.error('Error executing query: ' + err.stack);
            res.send('Error fetching data from database.');
            return;
        }

        let countQuery = `
            SELECT COUNT(*) AS total
            FROM (
                SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`
                FROM \`2023_1\`
                UNION
                SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`
                FROM \`2023_2\`
                UNION
                SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`
                FROM \`2023_3\`
            ) AS combined
            WHERE CAST(\`${category}\` AS SIGNED) >= ?
            ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
            AND \`${category}\` != '--'
        `;

        connection.query(countQuery, [rank], (countErr, countResults) => {
            if (countErr) {
                console.error('Error executing count query: ' + countErr.stack);
                res.send('Error fetching data from database.');
                return;
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.min(3, Math.ceil(totalItems / itemsPerPage));

            res.render("list.ejs", {
                data: results,
                category: category,
                rank: rank,
                preferredCourse: preferredCourse,
                page: parseInt(page),
                totalPages: totalPages
            });
        });
    });
});


// Route to handle PDF download
app.get("/downloadPDF", (req, res) => {
    const { rank, category, preferredCourse } = req.query;
    const itemsPerPage = 40;
    const courseFilter = getCourseFilter(preferredCourse);

    // Query database for all data
    let q = `
        SELECT 
            \`College_Name_Not_Found\` AS \`College Name Not Found\`,
            \`Course_Name\` AS \`Course Name\`,
            \`${category}\`
        FROM (
            SELECT 
                \`College_Name_Not_Found\`,
                \`Course_Name\`,
                \`${category}\`,
                90 AS ChanceOfGetting
            FROM \`2023_1\`
            WHERE CAST(\`${category}\` AS SIGNED) >= ?
            ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
            AND \`${category}\` != '--'
            
            UNION ALL
            
            SELECT 
                \`College_Name_Not_Found\`,
                \`Course_Name\`,
                \`${category}\`,
                60 AS ChanceOfGetting
            FROM \`2023_2\`
            WHERE CAST(\`${category}\` AS SIGNED) >= ?
            ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
            AND \`${category}\` != '--'
            AND NOT EXISTS (
                SELECT 1 FROM \`2023_1\`
                WHERE \`2023_1\`.\`College_Name_Not_Found\` = \`2023_2\`.\`College_Name_Not_Found\`
                AND \`2023_1\`.\`Course_Name\` = \`2023_2\`.\`Course_Name\`
                AND \`2023_1\`.\`${category}\` = \`2023_2\`.\`${category}\`
            )
            
            UNION ALL
            
            SELECT 
                \`College_Name_Not_Found\`,
                \`Course_Name\`,
                \`${category}\`,
                30 AS ChanceOfGetting
            FROM \`2023_3\`
            WHERE CAST(\`${category}\` AS SIGNED) >= ?
            ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ''}
            AND \`${category}\` != '--'
            AND NOT EXISTS (
                SELECT 1 FROM \`2023_1\`
                WHERE \`2023_1\`.\`College_Name_Not_Found\` = \`2023_3\`.\`College_Name_Not_Found\`
                AND \`2023_1\`.\`Course_Name\` = \`2023_3\`.\`Course_Name\`
                AND \`2023_1\`.\`${category}\` = \`2023_3\`.\`${category}\`
            )
            AND NOT EXISTS (
                SELECT 1 FROM \`2023_2\`
                WHERE \`2023_2\`.\`College_Name_Not_Found\` = \`2023_3\`.\`College_Name_Not_Found\`
                AND \`2023_2\`.\`Course_Name\` = \`2023_3\`.\`Course_Name\`
                AND \`2023_2\`.\`${category}\` = \`2023_3\`.\`${category}\`
            )
        ) AS combined
        ORDER BY CAST(\`${category}\` AS SIGNED) ASC
    `;

    connection.query(q, [rank, rank, rank], (err, results) => {
        if (err) {
            console.error('Error executing query: ' + err.stack);
            res.send('Error fetching data from database.');
            return;
        }

        // Generate HTML for the PDF content
        const htmlContent = generatePDFHtml(results);

        // Generate PDF from HTML
        htmlToPdf.create(htmlContent).toBuffer((pdfErr, buffer) => {
            if (pdfErr) {
                console.error('Error generating PDF: ' + pdfErr);
                res.status(500).send('Error generating PDF');
                return;
            }

            // Set response headers for PDF download
            res.setHeader('Content-Disposition', `attachment; filename="college_list.pdf"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(buffer);
        });
    });
});

// Helper function to generate HTML content for PDF
function generatePDFHtml(data) {
    let htmlContent = `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 10px;
                }
                table, th, td {
                    border: 1px solid black;
                    padding: 8px;
                }
                th {
                    background-color: #f2f2f2;
                }
                .center {
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h2>List of Colleges</h2>
            <table>
                <thead>
                    <tr>
                        <th>College Name Not Found</th>
                        <th>Course Name</th>
                        <th>${category}</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(row => {
        htmlContent += `
            <tr>
                <td>${row['College Name Not Found']}</td>
                <td>${row['Course Name']}</td>
                <td>${row[category]}</td>
            </tr>
        `;
    });

    htmlContent += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    return htmlContent;
}

// Helper function to get course filter based on preferred course
function getCourseFilter(preferredCourse) {
    switch (preferredCourse) {
        case 'IT':
            return `
                'AI Artificial Intelligence',
                'CA CS (AI, Machine Learning)',
                'CY CS- Cyber Security',
                'DS Comp. Sc. Engg- Data Sc.',
                'IO CS- Internet of Things',
                'EV EC Engg(VLSI Design)',
                'CB Comp. Sc. and Bus Sys.',
                'CD Computer Sc. and Design',
                'CF CS(Artificial Intel.)'
            `;
        case 'EC':
            return `
                'EC Electronics',
                'ET Elec. Telecommn. Engg.',
                'EI Elec. Inst. Engg',
                'MD Med.Elect.',
                'RI Robotics and AI',
                'TI Industrial IoT'
            `;
        case 'TRENDING':
            return `
                'AI Artificial Intelligence',
                'CA CS (AI, Machine Learning)',
                'CY CS- Cyber Security',
                'DS Comp. Sc. Engg- Data Sc.',
                'IO CS- Internet of Things',
                'EV EC Engg(VLSI Design)',
                'EC Electronics',
                'ET Elec. Telecommn. Engg.',
                'EI Elec. Inst. Engg',
                'MD Med.Elect.',
                'RI Robotics and AI',
                'TI Industrial IoT'
            `;
        default:
            return '';
    }
}

// Handle 404 - Keep this as the last middleware
app.use((req, res) => {
    res.status(404).send("Page not found");
});
