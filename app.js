const express = require("express");
const path = require("path");
const mysql = require("mysql2");
require("dotenv").config(); // Load environment variables

const app = express();
const port = 8000;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database: " + err.stack);
    return;
  }
  console.log("Connected to database as id " + connection.threadId);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("rank.ejs");
});

app.get("/list", (req, res) => {
  const { rank, category, preferredCourse, page = 1 } = req.query;
  const itemsPerPage = 40;
  const offset = (page - 1) * itemsPerPage;

  let courseFilter = "";
  if (preferredCourse === "IT") {
    courseFilter = `'AI Artificial Intelligence', 'CS Computers', 'IE Info.Science', 'CY CS- Cyber Security', 'DS Comp. Sc. Engg- Data Sc.', 'CA CS (AI, Machine Learning)', 'CB Comp. Sc. and Bus Sys.', 'CD Computer Sc. and Design', 'IC CS-IoT, Cyber Security', 'RI Robotics and AI', 'CO Computer Engineering', 'ZC CSC', 'CC Computer and Comm. Engg.'`;
  } else if (preferredCourse === "EC") {
    courseFilter = `'EC Electronics', 'EE Electrical', 'EI Elec. Inst. Engg', 'ET Elec. Telecommn. Engg.', 'EV EC Engg(VLSI Design)', 'RI Robotics and AI', 'BB B Tech in EC', 'BJ B Tech in EE'`;
  } else if (preferredCourse === "TRENDING") {
    courseFilter = `'AI Artificial Intelligence', 'CS Computers', 'IE Info.Science', 'CY CS- Cyber Security', 'DS Comp. Sc. Engg- Data Sc.', 'CA CS (AI, Machine Learning)', 'CB Comp. Sc. and Bus Sys.', 'CD Computer Sc. and Design', 'IC CS-IoT, Cyber Security', 'RI Robotics and AI', 'CO Computer Engineering', 'ZC CSC', 'CC Computer and Comm. Engg.', 'EC Electronics', 'ET Elec. Telecommn. Engg.', 'EI Elec. Inst. Engg', 'RI Robotics and AI', 'AD Artificial Intel, Data Sc'`;
  }

  let q = `
  SELECT 
    \`College_Name_Not_Found\` AS \`College Name Not Found\`,
    \`Course_Name\` AS \`Course Name\`,
    \`${category}\`,
    (CASE 
      WHEN ROUND = 1 THEN 90 
      WHEN ROUND = 2 THEN 60 
      ELSE 30 
    END) AS ChanceOfGetting,
    ROUND
  FROM (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY \`College_Name_Not_Found\`, \`Course_Name\` ORDER BY (CASE WHEN table_name = '2023_1' THEN 1 WHEN table_name = '2023_2' THEN 2 ELSE 3 END)) AS rn,
      (CASE 
        WHEN table_name = '2023_1' THEN 1 
        WHEN table_name = '2023_2' THEN 2 
        ELSE 3 
      END) AS ROUND
    FROM (
      SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_1' AS table_name
      FROM \`2023_1\`
      
      UNION ALL
      
      SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_2' AS table_name
      FROM \`2023_2\`
      
      UNION ALL
      
      SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_3' AS table_name
      FROM \`2023_3\`
    ) AS combined
    WHERE CAST(\`${category}\` AS SIGNED) >= ?
    ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ""}
    AND \`${category}\` != '--'
  ) AS ranked
  WHERE rn = 1
  ORDER BY CAST(\`${category}\` AS SIGNED) ASC
  LIMIT ${itemsPerPage} OFFSET ${offset}
`;

  console.log("Executing query: ", q);

  connection.query(q, [rank], (err, results) => {
    if (err) {
      console.error("Error executing query: " + err.stack);
      res.send("Error fetching data from database.");
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
      ${courseFilter ? `AND \`Course_Name\` IN (${courseFilter})` : ""}
      AND \`${category}\` != '--'
    `;

    console.log("Executing count query: ", countQuery);

    connection.query(countQuery, [rank], (countErr, countResults) => {
      if (countErr) {
        console.error("Error executing count query: " + countErr.stack);
        res.send("Error fetching data from database.");
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
        totalPages: totalPages,
      });
    });
  });
});

app.use((req, res) => {
  res.status(404).send("Page not found");
});
