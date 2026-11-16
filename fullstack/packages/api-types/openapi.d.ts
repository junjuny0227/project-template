// 자동 생성 파일입니다. 수정 후 pnpm openapi를 실행하세요.
export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_check"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    HealthController_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The Health Check is successful */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @example ok
                         * @enum {string}
                         */
                        status?: "ok" | "degraded";
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       }
                         *     }
                         */
                        info?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /** @example {} */
                        error?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       }
                         *     }
                         */
                        details?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        };
                    };
                };
            };
            /** @description The Health Check is not successful */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @example error
                         * @enum {string}
                         */
                        status?: "error" | "shutting_down";
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       }
                         *     }
                         */
                        info?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /**
                         * @example {
                         *       "redis": {
                         *         "status": "down",
                         *         "message": "Could not connect",
                         *         "responseTime": 3005
                         *       }
                         *     }
                         */
                        error?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       },
                         *       "redis": {
                         *         "status": "down",
                         *         "message": "Could not connect",
                         *         "responseTime": 3005
                         *       }
                         *     }
                         */
                        details?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        };
                    };
                };
            };
        };
    };
}
