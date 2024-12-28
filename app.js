import { readFile, writeFile } from "fs/promises";
import {createServer} from "http";
import crypto from "crypto";
import path from "path";

const PORT = 3001;

const DATA_FILE = path.join("data", "links.json");

const serveFile = async(res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, {"Content-Type": contentType});
        res.end(data);
    } catch(error) {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.end("404 Page Not Found");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENDENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return{};
        }
        throw error;
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
    console.log(req.url);
    
    if(req.method === "GET"){
        if (req.url === "/") {
            return serveFile(res, path.join("public", "index.html"), "text/html" );  
        } else if (req.url === "/style.css") {  
            return serveFile(res, path.join("public", "style.css"), "text/css" );  
        }
    }
    if (req.method === "POST" && req.url === "/Short") {

        const links = await loadLinks();

        let body = "";
        req.on("data", (chunk) => (body += chunk));

        req.on("end", async () => {
            console.log(body);
            const {url, shortUrl} = JSON.parse(body);

            if (!url) {
                res.writeHead(400, {"content-type": "text/plain"});
                return res.end("URL is required");
            }

            const finalShortUrl = shortUrl || crypto.randomBytes(4).toString("hex");
            if(links[finalShortUrl]){
                res.writeHead(400, {"content-type": "text/plain"});
                return res.end("Short url already exist. Please choose another."); 
            }

            links[finalShortUrl] = url;
            await saveLinks(links);
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({success: true, shortUrl: finalShortUrl}));
        });
    }
});

server.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`);
});
