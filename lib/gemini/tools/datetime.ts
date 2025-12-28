/**
 * DateTime Tool
 * 
 * Get current date, time, and timezone information.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolModule, ToolExecutionResult } from "./types";

export const declaration: FunctionDeclaration = {
    name: "get_current_datetime",
    description: "Get the current date, time, day of week, or perform date calculations. Use this whenever the user asks about current time, date, or time-related questions.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            timezone: {
                type: SchemaType.STRING,
                description: "IANA timezone name, e.g., 'Asia/Manila', 'America/New_York', 'Europe/London'. Default is UTC."
            },
            format: {
                type: SchemaType.STRING,
                description: "Output format preference: full, date_only, time_only, iso8601, relative"
            }
        },
        required: []
    }
};

export const handler = async (args: Record<string, unknown>): Promise<ToolExecutionResult> => {
    try {
        const timezone = String(args.timezone || "UTC");
        const format = String(args.format || "full");

        const now = new Date();

        // Create formatter with timezone
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZoneName: "short"
        };

        const formatter = new Intl.DateTimeFormat("en-US", options);
        const parts = formatter.formatToParts(now);

        const partsMap: Record<string, string> = {};
        parts.forEach(p => { partsMap[p.type] = p.value; });

        let result: Record<string, unknown>;

        switch (format) {
            case "date_only":
                result = {
                    date: `${partsMap.month} ${partsMap.day}, ${partsMap.year}`,
                    weekday: partsMap.weekday,
                    timezone
                };
                break;
            case "time_only":
                result = {
                    time: `${partsMap.hour}:${partsMap.minute}:${partsMap.second} ${partsMap.dayPeriod}`,
                    timezone,
                    timeZoneName: partsMap.timeZoneName
                };
                break;
            case "iso8601":
                result = {
                    iso: now.toISOString(),
                    timezone
                };
                break;
            default:
                result = {
                    datetime: formatter.format(now),
                    date: `${partsMap.month} ${partsMap.day}, ${partsMap.year}`,
                    time: `${partsMap.hour}:${partsMap.minute}:${partsMap.second} ${partsMap.dayPeriod}`,
                    weekday: partsMap.weekday,
                    timezone,
                    timeZoneName: partsMap.timeZoneName,
                    unixTimestamp: Math.floor(now.getTime() / 1000)
                };
        }

        return { success: true, result };
    } catch (error) {
        return {
            success: false,
            result: null,
            error: `DateTime failed: ${error instanceof Error ? error.message : "Invalid timezone"}`
        };
    }
};

const datetimeTool: ToolModule = { declaration, handler };
export default datetimeTool;
