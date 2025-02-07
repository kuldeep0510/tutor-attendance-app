"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var _a = require("whatsapp-web.js"), Client = _a.Client, LocalAuth = _a.LocalAuth, MessageMedia = _a.MessageMedia;
var qrcode = require("qrcode-terminal");
var cors = require("cors");
var uuidv4 = require("uuid").v4;
var fs = require("fs");
var path = require("path");
var puppeteer = require("puppeteer");
var config = require("./config");
var app = express();
// Configure CORS with more permissive settings
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Cache-Control', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '50mb' }));
var client = null;
var qr = null;
var browser = null;
var lastConnectionCheck = Date.now();
var isReady = false;
var isInitializing = false;
var connectionTimeout = null;
var messages = [];
var cleanup = function () { return __awaiter(void 0, void 0, void 0, function () {
    var authPath, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Running cleanup...");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                if (!client) return [3 /*break*/, 3];
                return [4 /*yield*/, client.destroy()];
            case 2:
                _a.sent();
                client = null;
                _a.label = 3;
            case 3:
                if (!browser) return [3 /*break*/, 5];
                return [4 /*yield*/, browser.close()];
            case 4:
                _a.sent();
                browser = null;
                _a.label = 5;
            case 5:
                authPath = path.join(__dirname, '.wwebjs_auth');
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                }
                qr = null;
                isInitializing = false;
                isReady = false;
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }
                console.log("Cleanup completed");
                return [3 /*break*/, 7];
            case 6:
                error_1 = _a.sent();
                console.error("Cleanup error:", error_1);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
app.get("/connect", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var qrReceived_1, responseHandled_1, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (isInitializing) {
                    res.status(400).json({ error: "Connection already in progress" });
                    return [2 /*return*/];
                }
                // Always clean up before starting new connection
                return [4 /*yield*/, cleanup()];
            case 1:
                // Always clean up before starting new connection
                _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 7]);
                isInitializing = true;
                console.log("Starting WhatsApp client initialization...");
                return [4 /*yield*/, puppeteer.launch({
                        headless: "new",
                        args: config.whatsapp.puppeteerArgs,
                        timeout: config.whatsapp.puppeteerTimeout
                    })];
            case 3:
                // Launch browser with extended timeout
                browser = _a.sent();
                qrReceived_1 = false;
                responseHandled_1 = false;
                client = new Client({
                    authStrategy: new LocalAuth({
                        clientId: config.whatsapp.clientId,
                        dataPath: path.join(__dirname, '.wwebjs_auth')
                    }),
                    puppeteer: {
                        browserWSEndpoint: browser === null || browser === void 0 ? void 0 : browser.wsEndpoint(),
                        args: config.whatsapp.puppeteerArgs,
                        timeout: config.whatsapp.puppeteerTimeout
                    }
                });
                client.on("qr", function (qrCode) {
                    console.log("QR code received");
                    qr = qrCode;
                    qrReceived_1 = true;
                    if (!responseHandled_1) {
                        res.json({ qr: qrCode });
                        responseHandled_1 = true;
                    }
                });
                client.on("ready", function () {
                    console.log("Client is ready!");
                    isInitializing = false;
                    isReady = true;
                    qr = null;
                    lastConnectionCheck = Date.now();
                    if (!responseHandled_1) {
                        res.json({ connected: true });
                        responseHandled_1 = true;
                    }
                });
                client.on("disconnected", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.log("Client disconnected");
                                return [4 /*yield*/, cleanup()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                client.on("auth_failure", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.error("Authentication failed");
                                return [4 /*yield*/, cleanup()];
                            case 1:
                                _a.sent();
                                if (!responseHandled_1) {
                                    res.status(401).json({ error: "Authentication failed" });
                                    responseHandled_1 = true;
                                }
                                return [2 /*return*/];
                        }
                    });
                }); });
                // Initialize the client
                return [4 /*yield*/, client.initialize()
                    // Set timeout for initialization
                ];
            case 4:
                // Initialize the client
                _a.sent();
                // Set timeout for initialization
                setTimeout(function () {
                    if (!responseHandled_1) {
                        if (qrReceived_1) {
                            // If QR was received but response wasn't sent yet
                            res.json({ qr: qr });
                        }
                        else {
                            console.log("Connection timeout");
                            res.status(408).json({ error: "Connection timeout" });
                            cleanup();
                        }
                        responseHandled_1 = true;
                    }
                }, 10000); // 10 second timeout
                return [3 /*break*/, 7];
            case 5:
                error_2 = _a.sent();
                console.error("Failed to initialize client:", error_2);
                return [4 /*yield*/, cleanup()];
            case 6:
                _a.sent();
                if (!res.headersSent) {
                    res.status(500).json({
                        error: "Failed to initialize WhatsApp: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error')
                    });
                }
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
app.get("/qr", function (req, res) {
    if (qr && !isReady) {
        res.json({ qr: qr });
    }
    else if (isReady) {
        res.json({ connected: true });
    }
    else {
        res.json({ waiting: true });
    }
});
app.post("/disconnect", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, cleanup()];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [2 /*return*/];
        }
    });
}); });
app.get("/status", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var state, info, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                if (!client) {
                    res.json({ connected: false });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, client.getState()];
            case 1:
                state = _a.sent();
                return [4 /*yield*/, client.info];
            case 2:
                info = _a.sent();
                isReady = state === 'CONNECTED' && !!info;
                lastConnectionCheck = Date.now();
                res.json({ connected: isReady });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error("Status check error:", error_3);
                res.json({ connected: false });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post("/send-message", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, to, message, pdfData, formattedNumber, media, messageLog, error_4, messageLog;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, to = _a.to, message = _a.message, pdfData = _a.pdfData;
                if (!client || !isReady) {
                    res.status(400).json({ success: false, error: "WhatsApp is not connected" });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                formattedNumber = "91".concat(to.replace(/\D/g, ''), "@c.us");
                return [4 /*yield*/, client.sendMessage(formattedNumber, message)];
            case 2:
                _b.sent();
                if (!pdfData) return [3 /*break*/, 4];
                console.log("Sending PDF...");
                media = new MessageMedia('application/pdf', pdfData.split(',')[1], 'bill.pdf');
                return [4 /*yield*/, client.sendMessage(formattedNumber, media, {
                        caption: "Tuition Bill PDF",
                        sendMediaAsDocument: true
                    })];
            case 3:
                _b.sent();
                _b.label = 4;
            case 4:
                messageLog = {
                    id: uuidv4(),
                    to: formattedNumber.replace('@c.us', ''),
                    message: pdfData ? "".concat(message, " [PDF Attached]") : message,
                    timestamp: new Date().toISOString(),
                    status: 'sent',
                };
                messages.push(messageLog);
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_4 = _b.sent();
                console.error("Failed to send message:", error_4);
                messageLog = {
                    id: uuidv4(),
                    to: to,
                    message: message,
                    timestamp: new Date().toISOString(),
                    status: 'failed',
                };
                messages.push(messageLog);
                res.status(500).json({
                    success: false,
                    error: "Failed to send message: ".concat(error_4 instanceof Error ? error_4.message : 'Unknown error')
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.get("/messages", function (req, res) {
    res.json(messages);
});
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', function (error) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.error('Uncaught Exception:', error);
                return [4 /*yield*/, cleanup()];
            case 1:
                _a.sent();
                process.exit(1);
                return [2 /*return*/];
        }
    });
}); });
app.get('/health', function (req, res) {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.listen(config.port, function () {
    console.log("WhatsApp server running at http://localhost:".concat(config.port));
});
