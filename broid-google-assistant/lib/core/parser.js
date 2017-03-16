"use strict";
const Promise = require("bluebird");
const broid_schemas_1 = require("broid-schemas");
const broid_utils_1 = require("broid-utils");
const uuid = require("node-uuid");
const R = require("ramda");
class Parser {
    constructor(serviceName, serviceID, username, logLevel) {
        this.serviceID = serviceID;
        this.generatorName = serviceName;
        this.logger = new broid_utils_1.Logger("parser", logLevel);
        this.username = username;
    }
    validate(event) {
        this.logger.debug("Validation process", { event });
        const parsed = broid_utils_1.cleanNulls(event);
        if (!parsed || R.isEmpty(parsed)) {
            return Promise.resolve(null);
        }
        if (!parsed.type) {
            this.logger.debug("Type not found.", { parsed });
            return Promise.resolve(null);
        }
        return broid_schemas_1.default(parsed, "activity")
            .then(() => parsed)
            .catch((err) => {
            this.logger.error(err);
            return null;
        });
    }
    parse(event) {
        this.logger.debug("Normalize process", { event });
        const normalized = broid_utils_1.cleanNulls(event);
        if (!normalized || R.isEmpty(normalized)) {
            return Promise.resolve(null);
        }
        const activitystreams = this.createActivityStream();
        let displayName = R.path(["user", "profile", "display_name"], normalized);
        if (!displayName && R.path(["user", "profile", "given_name"], normalized)
            && R.path(["user", "profile", "family_name"], normalized)) {
            displayName = `${R.path(["user", "profile", "given_name"], normalized)} ${R.path(["user", "profile", "family_name"], normalized)} `;
        }
        activitystreams.actor = {
            id: R.path(["user", "user_id"], normalized),
            name: displayName ? displayName : normalized.userId,
            type: "Person",
        };
        activitystreams.target = {
            id: this.username,
            name: this.username,
            type: "Application",
        };
        let input = R.path(["body", "inputs"], normalized) || [];
        input = input[0] || {};
        const context = R.map((arg) => {
            return {
                content: R.prop("raw_text", arg),
                name: R.prop("name", arg),
                type: "Object",
            };
        }, input.arguments || []);
        activitystreams.object = {
            content: normalized.userInput,
            context,
            id: normalized.conversationId || this.createIdentifier(),
            type: "Note",
        };
        return Promise.resolve(activitystreams);
    }
    createIdentifier() {
        return uuid.v4();
    }
    createActivityStream() {
        return {
            "@context": "https://www.w3.org/ns/activitystreams",
            "generator": {
                id: this.serviceID,
                name: this.generatorName,
                type: "Service",
            },
            "published": Math.floor(Date.now() / 1000),
            "type": "Create",
        };
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Parser;
