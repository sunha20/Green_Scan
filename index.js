const express = require("express");
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const cheerio = require("cheerio");
const request = require("request");

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getDB(name) {
    const db = await sqlite.open({
        filename: name,
        driver: sqlite3.Database,
    });
    return db;
}

app.get("/", async function (req, res) {
    res.render("index.ejs");
});

app.get("/barcode", async function (req, res) {
    res.render("barcode.ejs");
});

app.get("/search", async function (req, res) {
    res.render("search.ejs");
});

app.post("/barcodeShopping", async function (req, res) {
    let barcode = req.body.barcodeNum;
    let url = `http://www.koreannet.or.kr/home/hpisSrchGtin.gs1?gtin=${barcode}`;
    request(url, function (err, res1, html) {
        if (err) console.error(err);
        let $ = cheerio.load(html);
        let fullName = $(".productTit").text().trim().slice(14);
        let imgSrc;
        try {
            imgSrc = $("#detailImage")["0"].attribs.src;
        } catch {
            imgSrc = "";
        }
        let name = fullName.trim();
        let url = `http://www.g2b.go.kr:8053/search/unifiedSearch.do?pageNumber=1&sortBy=&ascDesc=&displayType=0001&resultSearchYn=&searchTarget=total&searchWord=${name}`;
        request(encodeURI(url), async function (err, res2, html) {
            if (err) console.error(err);
            let $ = cheerio.load(html);
            let arr = $(".labelNum").first().text().split("-");
            let idNum = arr[1];
            let classNum = arr[0];
            let db = await getDB("./public/greenProduct.db");
            let query1 = `select * from greenProduct where 식별번호 = ${idNum} or 모델명 = '${name}'`;
            let query2 = `select * from greenProduct where 분류번호 = ${classNum}`;
            let rows1 = await db.all(query1);
            let rows2 = await db.all(query2);
            let isGreen = rows1.length > 0;
            res.render("shopping.ejs", {
                name: name,
                isGreen: isGreen,
                imgSrc: imgSrc,
                greenItems: rows2,
            });
        });
    });
});

app.post("/searchShopping", async function (req, res) {
    let name = req.body.productName;
    let url = `http://www.g2b.go.kr:8053/search/unifiedSearch.do?pageNumber=1&sortBy=&ascDesc=&displayType=0001&resultSearchYn=&searchTarget=total&searchWord=${name}`;
    request(encodeURI(url), async function (err, res2, html) {
        if (err) console.error(err);
        let $ = cheerio.load(html);
        let arr = $(".labelNum").first().text().split("-");
        let idNum = arr[1];
        let classNum = arr[0];
        let db = await getDB("./public/greenProduct.db");
        let query1 = `select * from greenProduct where 식별번호 = ${idNum} or 모델명 = '${name}'`;
        let query2 = `select * from greenProduct where 분류번호 = ${classNum}`;
        let rows1 = await db.all(query1);
        let rows2 = await db.all(query2);
        let isGreen = rows1.length > 0;
        res.render("shopping.ejs", {
            name: name,
            isGreen: isGreen,
            imgSrc: null,
            greenItems: rows2,
        });
    });
});

app.get("/map", async function (req, res) {
    res.render("map.ejs");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("서버가 실행됐습니다.");
    console.log(`서버주소: http://localhost:${PORT}`);
});
