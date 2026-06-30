"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoteRepository = exports.TemplateRepository = exports.UserRepository = exports.closePool = exports.checkConnection = exports.transaction = exports.query = exports.pool = void 0;
// Core database connection and helper exports
var db_js_1 = require("./db.js");
Object.defineProperty(exports, "pool", { enumerable: true, get: function () { return db_js_1.pool; } });
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return db_js_1.query; } });
Object.defineProperty(exports, "transaction", { enumerable: true, get: function () { return db_js_1.transaction; } });
Object.defineProperty(exports, "checkConnection", { enumerable: true, get: function () { return db_js_1.checkConnection; } });
Object.defineProperty(exports, "closePool", { enumerable: true, get: function () { return db_js_1.closePool; } });
// User repository and types
var user_repository_js_1 = require("./repositories/user-repository.js");
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return user_repository_js_1.UserRepository; } });
// Template repository and types
var template_repository_js_1 = require("./repositories/template-repository.js");
Object.defineProperty(exports, "TemplateRepository", { enumerable: true, get: function () { return template_repository_js_1.TemplateRepository; } });
// Vote repository and types (upvote only)
var vote_repository_js_1 = require("./repositories/vote-repository.js");
Object.defineProperty(exports, "VoteRepository", { enumerable: true, get: function () { return vote_repository_js_1.VoteRepository; } });
//# sourceMappingURL=index.js.map