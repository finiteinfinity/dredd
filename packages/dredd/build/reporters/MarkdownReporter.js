"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const untildify_1 = __importDefault(require("untildify"));
const make_dir_1 = __importDefault(require("make-dir"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../logger"));
const reporterOutputLogger_1 = __importDefault(require("./reporterOutputLogger"));
const prettifyResponse_1 = __importDefault(require("../prettifyResponse"));
function MarkdownReporter(emitter, stats, path, details) {
    events_1.EventEmitter.call(this);
    this.type = 'markdown';
    this.stats = stats;
    this.buf = '';
    this.level = 1;
    this.details = details;
    this.path = this.sanitizedPath(path);
    this.configureEmitter(emitter);
    logger_1.default.debug(`Using '${this.type}' reporter.`);
}
MarkdownReporter.prototype.sanitizedPath = function sanitizedPath(path = './report.md') {
    const filePath = path_1.default.resolve(untildify_1.default(path));
    if (fs_1.default.existsSync(filePath)) {
        logger_1.default.warn(`File exists at ${filePath}, will be overwritten...`);
    }
    return filePath;
};
MarkdownReporter.prototype.configureEmitter = function configureEmitter(emitter) {
    const title = (str) => `${Array(this.level).join('#')} ${str}`;
    emitter.on('start', (apiDescriptions, callback) => {
        this.level++;
        this.buf += `${title('Dredd Tests')}\n`;
        callback();
    });
    emitter.on('end', (callback) => {
        make_dir_1.default(path_1.default.dirname(this.path))
            .then(() => {
            fs_1.default.writeFile(this.path, this.buf, (error) => {
                if (error) {
                    reporterOutputLogger_1.default.error(error);
                }
                callback();
            });
        })
            .catch((err) => {
            reporterOutputLogger_1.default.error(err);
            callback();
        });
    });
    emitter.on('test start', () => {
        this.level++;
    });
    emitter.on('test pass', (test) => {
        this.buf += `${title(`Pass: ${test.title}`)}\n`;
        if (this.details) {
            this.level++;
            this.buf += `${title('Request')}\n\`\`\`\n${prettifyResponse_1.default(test.request)}\n\`\`\`\n\n`;
            this.buf += `${title('Expected')}\n\`\`\`\n${prettifyResponse_1.default(test.expected)}\n\`\`\`\n\n`;
            this.buf += `${title('Actual')}\n\`\`\`\n${prettifyResponse_1.default(test.actual)}\n\`\`\`\n\n`;
            this.level--;
        }
        this.level--;
    });
    emitter.on('test skip', (test) => {
        this.buf += `${title(`Skip: ${test.title}`)}\n`;
        this.level--;
    });
    emitter.on('test fail', (test) => {
        this.buf += title(`Fail: ${test.title}\n`);
        this.level++;
        this.buf += `${title('Message')}\n\`\`\`\n${test.message}\n\`\`\`\n\n`;
        this.buf += `${title('Request')}\n\`\`\`\n${prettifyResponse_1.default(test.request)}\n\`\`\`\n\n`;
        this.buf += `${title('Expected')}\n\`\`\`\n${prettifyResponse_1.default(test.expected)}\n\`\`\`\n\n`;
        this.buf += `${title('Actual')}\n\`\`\`\n${prettifyResponse_1.default(test.actual)}\n\`\`\`\n\n`;
        this.level--;
        this.level--;
    });
    emitter.on('test error', (error, test) => {
        this.buf += title(`Error: ${test.title}\n`);
        this.buf += '\n```\n';
        this.buf += `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
        this.buf += '```\n\n';
        this.level--;
    });
};
util_1.inherits(MarkdownReporter, events_1.EventEmitter);
exports.default = MarkdownReporter;
