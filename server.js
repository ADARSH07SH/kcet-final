const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const PDFDocument = require("pdfkit");
require("dotenv").config();
import { injectSpeedInsights } from "@vercel/speed-insights";
const { inject } = require("@vercel/analytics");


const app = express();
const port = process.env.PORT || 8000;

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
  injectSpeedInsights();
  inject();

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
  switch (preferredCourse) {
    case "IT":
      courseFilter = [
        "'AD Artificial Intel, Data Sc'",
        "'IE Info.Science'",
        "'AM B Tech in AM'",
        "'AI Artificial Intelligence'",
        "'CS Computers'",
        "'CY CS- Cyber Security'",
        "'DS Comp. Sc. Engg- Data Sc.'",
        "'CA CS (AI, Machine Learning)'",
        "'CB Comp. Sc. and Bus Sys.'",
        "'CD Computer Sc. and Design'",
        "'IC CS-IoT, Cyber Security'",
        "'BW B Tech in CS'",
        "'CF CS(Artificial Intel.)'",
        "'CO Computer Engineering'",
        "'CC Computer and Comm. Engg.'",
        "'ES Electronics and Computer'",
        "'ZC CSC'",
        "'IO CS- Internet of Things'",
        "'DM B.TECH IN CS NW'",
        "'DL B.TECH IN CS'",
        "'DC Data Sciences'",
        "'LG B Tech in CS'",
        "'CW B Tech in IT'",
        "'BZ B Tech in DS'",
        "'BH B Tech in AI'",
        "'DE B Tech in PE'",
        "'LD B Tech in DS'",
        "'LE B Tech in AIML'",
        "'LF B Tech in CC'",
        "'LH B Tech in IS'",
        "'LK B Tech in IOT'",
        "'CM B Tech in EV'",
        "'DN B.Tech in VLSI'",
        "'DH B Tech in RAI'",
        "'BR BioMed. and Robotic Engg'",
      ].join(", ");
      break;

    case "EC":
      courseFilter = [
        "'EC Electronics'",
        "'EE Electrical'",
        "'EI Elec. Inst. Engg'",
        "'ET Elec. Telecommn. Engg.'",
        "'EV EC Engg(VLSI Design)'",
        "'RI Robotics and AI'",
        "'BB B Tech in EC'",
        "'BJ B Tech in EE'",
      ].join(", ");
      break;
    case "TRENDING":
      courseFilter = [
        "'AI Artificial Intelligence'",
        "'EC Electronics'",
        "'EE Electrical'",
        "'EI Elec. Inst. Engg'",
        "'ET Elec. Telecommn. Engg.'",
        "'EV EC Engg(VLSI Design)'",
        "'RI Robotics and AI'",
        "'BB B Tech in EC'",
        "'BJ B Tech in EE'",
        "'CY CS- Cyber Security'",
        "'DS Comp. Sc. Engg- Data Sc.'",
        "'CA CS (AI, Machine Learning)'",
        "'CB Comp. Sc. and Bus Sys.'",
        "'CD Computer Sc. and Design'",
        "'IC CS-IoT, Cyber Security'",
        "'CO Computer Engineering'",
        "'ZC CSC'",
        "'CC Computer and Comm. Engg.'",
        "'IO CS- Internet of Things'",
        "'DM B.TECH IN CS NW'",
        "'DL B.TECH IN CS'",
        "'DC Data Sciences'",
        "'LG B Tech in CS'",
        "'CW B Tech in IT'",
        "'BZ B Tech in DS'",
        "'BH B Tech in AI'",
        "'DE B Tech in PE'",
        "'LD B Tech in DS'",
        "'LE B Tech in AIML'",
        "'LF B Tech in CC'",
        "'LH B Tech in IS'",
        "'LK B Tech in IOT'",
        "'AD Artificial Intel, Data Sc'",
        "'IE Info.Science'",
        "'AM B Tech in AM'",
        "'AI Artificial Intelligence'",
        "'CS Computers'",
        "'CY CS- Cyber Security'",
        "'DS Comp. Sc. Engg- Data Sc.'",
        "'CA CS (AI, Machine Learning)'",
        "'CB Comp. Sc. and Bus Sys.'",
        "'CD Computer Sc. and Design'",
        "'IC CS-IoT, Cyber Security'",
        "'BW B Tech in CS'",
        "'ET Elec. Telecommn. Engg.'",
        "'EI Elec. Inst. Engg'",
        "'AD Artificial Intel, Data Sc'",
      ].join(", ");
      break;
    default:
      break;
  }

  let q = `
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
    ${
      courseFilter
        ? `AND REPLACE(REPLACE(\`Course_Name\`, '\\n', ''), '\\r', '') IN (${courseFilter})`
        : ""
    }
    AND \`${category}\` != '--'
  `;

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

app.get("/download", (req, res) => {
  const { rank, category, preferredCourse } = req.query;

  let courseFilter = "";
  if (preferredCourse === "IT") {
    courseFilter = [
      "'AD Artificial Intel, Data Sc'",
      "'IE Info.Science'",
      "'AM B Tech in AM'",
      "'AI Artificial Intelligence'",
      "'CS Computers'",
      "'CY CS- Cyber Security'",
      "'DS Comp. Sc. Engg- Data Sc.'",
      "'CA CS (AI, Machine Learning)'",
      "'CB Comp. Sc. and Bus Sys.'",
      "'CD Computer Sc. and Design'",
      "'IC CS-IoT, Cyber Security'",
      "'BW B Tech in CS'",
      "'CF CS(Artificial Intel.)'",
      "'CO Computer Engineering'",
      "'CC Computer and Comm. Engg.'",
      "'ES Electronics and Computer'",
      "'ZC CSC'",
      "'IO CS- Internet of Things'",
      "'DM B.TECH IN CS NW'",
      "'DL B.TECH IN CS'",
      "'DC Data Sciences'",
      "'LG B Tech in CS'",
      "'CW B Tech in IT'",
      "'BZ B Tech in DS'",
      "'BH B Tech in AI'",
      "'DE B Tech in PE'",
      "'LD B Tech in DS'",
      "'LE B Tech in AIML'",
      "'LF B Tech in CC'",
      "'LH B Tech in IS'",
      "'LK B Tech in IOT'",
      "'CM B Tech in EV'",
      "'DN B.Tech in VLSI'",
      "'DH B Tech in RAI'",
      "'BR BioMed. and Robotic Engg'",
    ].join(", ");
  } else if (preferredCourse === "EC") {
    courseFilter = [
      "'EC Electronics'",
      "'EE Electrical'",
      "'EI Elec. Inst. Engg'",
      "'ET Elec. Telecommn. Engg.'",
      "'EV EC Engg(VLSI Design)'",
      "'RI Robotics and AI'",
      "'BB B Tech in EC'",
      "'BJ B Tech in EE'",
    ].join(", ");
  } else if (preferredCourse === "TRENDING") {
    courseFilter = [
      "'AI Artificial Intelligence'",
      "'EC Electronics'",
      "'EE Electrical'",
      "'EI Elec. Inst. Engg'",
      "'ET Elec. Telecommn. Engg.'",
      "'EV EC Engg(VLSI Design)'",
      "'RI Robotics and AI'",
      "'BB B Tech in EC'",
      "'BJ B Tech in EE'",
      "'CY CS- Cyber Security'",
      "'DS Comp. Sc. Engg- Data Sc.'",
      "'CA CS (AI, Machine Learning)'",
      "'CB Comp. Sc. and Bus Sys.'",
      "'CD Computer Sc. and Design'",
      "'IC CS-IoT, Cyber Security'",
      "'CO Computer Engineering'",
      "'ZC CSC'",
      "'CC Computer and Comm. Engg.'",
      "'IO CS- Internet of Things'",
      "'DM B.TECH IN CS NW'",
      "'DL B.TECH IN CS'",
      "'DC Data Sciences'",
      "'LG B Tech in CS'",
      "'CW B Tech in IT'",
      "'BZ B Tech in DS'",
      "'BH B Tech in AI'",
      "'DE B Tech in PE'",
      "'LD B Tech in DS'",
      "'LE B Tech in AIML'",
      "'LF B Tech in CC'",
      "'LH B Tech in IS'",
      "'LK B Tech in IOT'",
      "'AD Artificial Intel, Data Sc'",
      "'IE Info.Science'",
      "'AM B Tech in AM'",
      "'AI Artificial Intelligence'",
      "'CS Computers'",
      "'CY CS- Cyber Security'",
      "'DS Comp. Sc. Engg- Data Sc.'",
      "'CA CS (AI, Machine Learning)'",
      "'CB Comp. Sc. and Bus Sys.'",
      "'CD Computer Sc. and Design'",
      "'IC CS-IoT, Cyber Security'",
      "'BW B Tech in CS'",
      "'ET Elec. Telecommn. Engg.'",
      "'EI Elec. Inst. Engg'",
      "'AD Artificial Intel, Data Sc'",
    ].join(", ");
  }

  let q = `
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

  connection.query(q, [rank], (err, results) => {
    if (err) {
      console.error("Error executing query: " + err.stack);
      res.send("Error fetching data from database.");
      return;
    }

    const sortedResults = [];
    for (let i = 0; i < results.length; i += 30) {
      const chunk = results.slice(i, i + 30);
      chunk.sort((a, b) => b.Round - a.Round);
      sortedResults.push(...chunk);

      // Log each chunk to the terminal
      console.log(`Chunk ${Math.floor(i / 30) + 1}:`);
      console.log(chunk);
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
      doc.text("Sl. No.", 30, y, { width: 30, align: "left" });
      doc.text("College Name", 70, y, { width: 180, align: "left" });
      doc.text("Course Name", 250, y, { width: 100, align: "left" });
      doc.text(`Cutoff Rank (Category ${category})`, 350, y, {
        width: 100,
        align: "center",
      });
      doc.text("Round", 450, y, { width: 50, align: "center" });
      doc.text("Chance of Getting", 500, y, { width: 70, align: "center" });

      doc.moveDown(1);
    }

    function generateTableRow(row, index) {
      const y = doc.y;
      const cellHeight = 40;
      const padding = 6;
      doc.fontSize(10).font("Helvetica");
      doc.rect(30, y, 30, cellHeight).stroke();
      doc.text(index + 1, 30, y + padding, { width: 30, align: "center" });
      doc.rect(70, y, 180, cellHeight).stroke();
      doc.text(row["College Name Not Found"], 70, y + padding, {
        width: 180,
        align: "center",
        ellipsis: true,
        height: cellHeight - 2 * padding,
        lineGap: 3,
      });
      doc.rect(250, y, 100, cellHeight).stroke();
      doc.text(row["Course Name"], 250, y + padding, {
        width: 100,
        align: "center",
        ellipsis: true,
        height: cellHeight - 2 * padding,
        lineGap: 3,
      });
      doc.rect(350, y, 100, cellHeight).stroke();
      doc.text(row[category].toString(), 350, y + padding, {
        width: 100,
        align: "center",
        ellipsis: true,
        height: cellHeight - 2 * padding,
        lineGap: 3,
      });
      doc.rect(450, y, 50, cellHeight).stroke();
      doc.text(row["ROUND"].toString(), 450, y + padding, {
        width: 50,
        align: "center",
        ellipsis: true,
        height: cellHeight - 2 * padding,
        lineGap: 3,
      });
      doc.rect(500, y, 70, cellHeight).stroke();
      doc.text(row["ChanceOfGetting"].toString(), 500, y + padding, {
        width: 70,
        align: "center",
        ellipsis: true,
        height: cellHeight - 2 * padding,
        lineGap: 3,
      });

      doc.y += cellHeight;
    }

    const itemsPerPage = 10;
    sortedResults.slice(0, 75).forEach((row, index) => {
      if (index % itemsPerPage === 0) {
        if (index > 0) {
          doc.addPage();
        }
        generateTableHeaders();
      }
      generateTableRow(row, index);
    });

    doc.end();
    doc.pipe(res);
  });
});
