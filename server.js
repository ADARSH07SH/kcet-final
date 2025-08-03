const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const PDFDocument = require("pdfkit");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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

function getCourseFilter(preferredCourse) {
  const courses = {
    IT: [
      "AD Artificial Intel, Data Sc",
      "IE Info.Science",
      "AM B Tech in AM",
      "AI Artificial Intelligence",
      "CS Computers",
      "CY CS- Cyber Security",
      "DS Comp. Sc. Engg- Data Sc.",
      "CA CS (AI, Machine Learning)",
      "CB Comp. Sc. and Bus Sys.",
      "CD Computer Sc. and Design",
      "IC CS-IoT, Cyber Security",
      "BW B Tech in CS",
      "CF CS(Artificial Intel.)",
      "CO Computer Engineering",
      "CC Computer and Comm. Engg.",
      "ES Electronics and Computer",
      "ZC CSC",
      "IO CS- Internet of Things",
      "DM B.TECH IN CS NW",
      "DL B.TECH IN CS",
      "DC Data Sciences",
      "LG B Tech in CS",
      "CW B Tech in IT",
      "BZ B Tech in DS",
      "BH B Tech in AI",
      "DE B Tech in PE",
      "LD B Tech in DS",
      "LE B Tech in AIML",
      "LF B Tech in CC",
      "LH B Tech in IS",
      "LK B Tech in IOT",
      "CM B Tech in EV",
      "DN B.Tech in VLSI",
      "DH B Tech in RAI",
      "BR BioMed. and Robotic Engg",
    ],
    EC: [
      "EC Electronics",
      "EE Electrical",
      "EI Elec. Inst. Engg",
      "ET Elec. Telecommn. Engg.",
      "EV EC Engg(VLSI Design)",
      "RI Robotics and AI",
      "BB B Tech in EC",
      "BJ B Tech in EE",
    ],
    TRENDING: [
      "AI Artificial Intelligence",
      "EC Electronics",
      "EE Electrical",
      "EI Elec. Inst. Engg",
      "ET Elec. Telecommn. Engg.",
      "EV EC Engg(VLSI Design)",
      "RI Robotics and AI",
      "BB B Tech in EC",
      "BJ B Tech in EE",
      "CY CS- Cyber Security",
      "DS Comp. Sc. Engg- Data Sc.",
      "CA CS (AI, Machine Learning)",
      "CB Comp. Sc. and Bus Sys.",
      "CD Computer Sc. and Design",
      "IC CS-IoT, Cyber Security",
      "CO Computer Engineering",
      "ZC CSC",
      "CC Computer and Comm. Engg.",
      "IO CS- Internet of Things",
      "DM B.TECH IN CS NW",
      "DL B.TECH IN CS",
      "DC Data Sciences",
      "LG B Tech in CS",
      "CW B Tech in IT",
      "BZ B Tech in DS",
      "BH B Tech in AI",
      "DE B Tech in PE",
      "LD B Tech in DS",
      "LE B Tech in AIML",
      "LF B Tech in CC",
      "LH B Tech in IS",
      "LK B Tech in IOT",
      "AD Artificial Intel, Data Sc",
      "IE Info.Science",
      "AM B Tech in AM",
      "CS Computers",
      "BW B Tech in CS",
    ],
  };

  return preferredCourse && courses[preferredCourse]
    ? courses[preferredCourse].map((c) => `'${c}'`).join(", ")
    : "";
}

app.get("/list", (req, res) => {
  const { rank, category, preferredCourse, page = 1 } = req.query;
  const itemsPerPage = 40;
  const offset = (page - 1) * itemsPerPage;
  const courseFilter = getCourseFilter(preferredCourse);

  const query = `
    SELECT 
      REPLACE(REPLACE(\`College_Name_Not_Found\`, '\\n', ''), '\\r', '') AS \`College Name Not Found\`,
      REPLACE(REPLACE(\`Course_Name\`, '\\n', ''), '\\r', '') AS \`Course Name\`,
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
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_1' AS table_name FROM \`2023_1\`
        UNION ALL
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_2' AS table_name FROM \`2023_2\`
        UNION ALL
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_3' AS table_name FROM \`2023_3\`
      ) AS combined
      WHERE CAST(\`${category}\` AS SIGNED) >= ?
      ${
        courseFilter
          ? `AND REPLACE(REPLACE(\`Course_Name\`, '\\n', ''), '\\r', '') IN (${courseFilter})`
          : ""
      }
      AND \`${category}\` != '--'
    ) AS ranked
    WHERE rn = 1
    ORDER BY CAST(\`${category}\` AS SIGNED) ASC
    LIMIT ${itemsPerPage} OFFSET ${offset}
  `;

  pool.query(query, [rank], (err, results) => {
    if (err) {
      console.log(
        "There was a problem fetching college list from the database."
      );
      res.send("Database error.");
      return;
    }

    const countQuery = `
      SELECT COUNT(*) AS total FROM (
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\` FROM \`2023_1\`
        UNION
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\` FROM \`2023_2\`
        UNION
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\` FROM \`2023_3\`
      ) AS combined
      WHERE CAST(\`${category}\` AS SIGNED) >= ?
      ${
        courseFilter
          ? `AND REPLACE(REPLACE(\`Course_Name\`, '\\n', ''), '\\r', '') IN (${courseFilter})`
          : ""
      }
      AND \`${category}\` != '--'
    `;

    pool.query(countQuery, [rank], (countErr, countResults) => {
      if (countErr) {
        console.log("Failed to count matching colleges.");
        res.send("Error fetching count.");
        return;
      }

      const totalItems = countResults[0].total;
      const totalPages = Math.min(3, Math.ceil(totalItems / itemsPerPage));

      console.log(`Rendering page ${page} with ${results.length} colleges.`);

      res.render("list.ejs", {
        data: results,
        category,
        rank,
        preferredCourse,
        page: parseInt(page),
        totalPages,
      });
    });
  });
});

app.get("/download", (req, res) => {
  const { rank, category, preferredCourse } = req.query;
  const courseFilter = getCourseFilter(preferredCourse);

  const query = `
    SELECT 
      REPLACE(REPLACE(\`College_Name_Not_Found\`, '\\n', ''), '\\r', '') AS \`College Name Not Found\`,
      REPLACE(REPLACE(\`Course_Name\`, '\\n', ''), '\\r', '') AS \`Course Name\`,
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
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_1' AS table_name FROM \`2023_1\`
        UNION ALL
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_2\` AS table_name FROM \`2023_2\`
        UNION ALL
        SELECT \`College_Name_Not_Found\`, \`Course_Name\`, \`${category}\`, '2023_3' AS table_name FROM \`2023_3\`
      ) AS combined
      WHERE CAST(\`${category}\` AS SIGNED) >= ?
      ${
        courseFilter
          ? `AND REPLACE(REPLACE(\`Course_Name\`, '\\n', ''), '\\r', '') IN (${courseFilter})`
          : ""
      }
      AND \`${category}\` != '--'
    ) AS ranked
    WHERE rn = 1
    ORDER BY CAST(\`${category}\` AS SIGNED) ASC
    LIMIT 75
  `;

  pool.query(query, [rank], (err, results) => {
    if (err) {
      console.log("Error while generating PDF list.");
      res.send("Failed to generate PDF.");
      return;
    }

    console.log(`Generating PDF for ${results.length} colleges.`);

    const sortedResults = [];
    for (let i = 0; i < results.length; i += 30) {
      const chunk = results.slice(i, i + 30);
      chunk.sort((a, b) => b.Round - a.Round);
      sortedResults.push(...chunk);
    }

    const doc = new PDFDocument({ margin: 30 });

    res.setHeader(
      "Content-disposition",
      "attachment; filename=CollegesList.pdf"
    );
    res.setHeader("Content-type", "application/pdf");

    doc
      .fontSize(25)
      .font("Helvetica-Bold")
      .text("List of Matched Colleges", { align: "center" });
    doc.moveDown();

    function generateTableHeaders() {
      doc.fontSize(12).font("Helvetica-Bold");
      const y = doc.y;
      doc.text("Sl. No.", 30, y, { width: 30 });
      doc.text("College Name", 70, y, { width: 180 });
      doc.text("Course Name", 250, y, { width: 100 });
      doc.text(`Cutoff Rank (${category})`, 350, y, { width: 100 });
      doc.text("Round", 450, y, { width: 50 });
      doc.text("Chance", 500, y, { width: 70 });
      doc.moveDown(1);
    }

    function generateTableRow(row, index) {
      const y = doc.y;
      const h = 40;
      const p = 6;
      doc.fontSize(10).font("Helvetica");
      doc.rect(30, y, 30, h).stroke();
      doc.text(index + 1, 30, y + p, { width: 30, align: "center" });
      doc.rect(70, y, 180, h).stroke();
      doc.text(row["College Name Not Found"], 70, y + p, {
        width: 180,
        align: "center",
      });
      doc.rect(250, y, 100, h).stroke();
      doc.text(row["Course Name"], 250, y + p, { width: 100, align: "center" });
      doc.rect(350, y, 100, h).stroke();
      doc.text(row[category], 350, y + p, { width: 100, align: "center" });
      doc.rect(450, y, 50, h).stroke();
      doc.text(row["ROUND"], 450, y + p, { width: 50, align: "center" });
      doc.rect(500, y, 70, h).stroke();
      doc.text(row["ChanceOfGetting"], 500, y + p, {
        width: 70,
        align: "center",
      });
      doc.y += h;
    }

    const itemsPerPage = 10;
    sortedResults.slice(0, 75).forEach((row, index) => {
      if (index % itemsPerPage === 0) {
        if (index > 0) doc.addPage();
        generateTableHeaders();
      }
      generateTableRow(row, index);
    });

    doc.end();
    doc.pipe(res);
  });
});
