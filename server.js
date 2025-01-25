import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

// Use absolute paths to ensure consistency
const DATA_FILE = path.resolve(__dirname, "data", "links.json");

const serveFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Page Not Found");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") { // Fixed typo
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error; // Re-throw other errors
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
    console.log(req.method, req.url);

    if (req.method === "GET") {
         // Serve index.html
        if (req.url === "/") {
            return serveFile(res, path.resolve(__dirname, "public", "index.html"), "text/html");
        } 
        // Serve style.css
        else if (req.url === "/style.css") {
            return serveFile(res, path.resolve(__dirname, "public", "style.css"), "text/css");
        } 
        // Serve links.json data
         else if (req.url === "/links") {
            const links = await loadLinks();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(links));
        } 
        // Redirect short URLs
        else {
            const links = await loadLinks();
            const shortUrl = req.url.slice(1);  // Extract short URL

            if (links[shortUrl]) {
                res.writeHead(302, { Location: links[shortUrl] });  // Redirect
                return res.end();
            }

            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Shortened URL not found.");
        }
    }

    if (req.method === "POST" && req.url.toLowerCase() === "/short") { // Make endpoint case-insensitive
        const links = await loadLinks();

        let body = "";
        req.on("data", (chunk) => (body += chunk));  // Collect data from the request body

        req.on("end", async () => {
            try {
                const { url, shortUrl } = JSON.parse(body); // Parse JSON

                if (!url) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end("URL is required.");
                }

                const finalShortUrl = shortUrl || crypto.randomBytes(4).toString("hex");

                if (links[finalShortUrl]) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end("Short URL already exists. Please choose another.");
                }

                links[finalShortUrl] = url;   // Add the new URL to the links object
                await saveLinks(links);   // Save the updated links to the file

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, shortUrl: finalShortUrl }));
            } catch (error) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Invalid request payload.");
            }
        });

        req.on("error", (error) => {
            console.error("Error in request body:", error);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error.");
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});





