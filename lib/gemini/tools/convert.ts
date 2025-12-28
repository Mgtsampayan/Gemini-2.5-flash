/**
 * Unit Conversion Tool
 * 
 * Convert between different units of measurement.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolModule, ToolExecutionResult } from "./types";

export const declaration: FunctionDeclaration = {
    name: "convert_units",
    description: "Convert between units of measurement: length, weight, temperature, volume, area, speed, data sizes, currency (approximate), and more.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            value: {
                type: SchemaType.NUMBER,
                description: "The numeric value to convert"
            },
            from_unit: {
                type: SchemaType.STRING,
                description: "Source unit (e.g., 'km', 'miles', 'celsius', 'kg', 'GB')"
            },
            to_unit: {
                type: SchemaType.STRING,
                description: "Target unit (e.g., 'meters', 'feet', 'fahrenheit', 'lb', 'MB')"
            }
        },
        required: ["value", "from_unit", "to_unit"]
    }
};

function getTemperatureFormula(from: string, to: string): string {
    const formulas: Record<string, string> = {
        "cf": "°F = °C × 9/5 + 32",
        "fc": "°C = (°F - 32) × 5/9",
        "ck": "K = °C + 273.15",
        "kc": "°C = K - 273.15",
        "fk": "K = (°F - 32) × 5/9 + 273.15",
        "kf": "°F = (K - 273.15) × 9/5 + 32",
    };
    return formulas[from + to] || "";
}

export const handler = async (args: Record<string, unknown>): Promise<ToolExecutionResult> => {
    try {
        const value = Number(args.value);
        const from = String(args.from_unit).toLowerCase();
        const to = String(args.to_unit).toLowerCase();

        // Conversion factors to base units
        const conversions: Record<string, Record<string, number>> = {
            // Length (base: meters)
            length: {
                m: 1, meter: 1, meters: 1,
                km: 1000, kilometer: 1000, kilometers: 1000,
                cm: 0.01, centimeter: 0.01, centimeters: 0.01,
                mm: 0.001, millimeter: 0.001, millimeters: 0.001,
                mi: 1609.344, mile: 1609.344, miles: 1609.344,
                ft: 0.3048, foot: 0.3048, feet: 0.3048,
                in: 0.0254, inch: 0.0254, inches: 0.0254,
                yd: 0.9144, yard: 0.9144, yards: 0.9144,
            },
            // Weight (base: grams)
            weight: {
                g: 1, gram: 1, grams: 1,
                kg: 1000, kilogram: 1000, kilograms: 1000,
                mg: 0.001, milligram: 0.001, milligrams: 0.001,
                lb: 453.592, pound: 453.592, pounds: 453.592,
                oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
                ton: 907185, tons: 907185,
            },
            // Data (base: bytes)
            data: {
                b: 1, byte: 1, bytes: 1,
                kb: 1024, kilobyte: 1024, kilobytes: 1024,
                mb: 1048576, megabyte: 1048576, megabytes: 1048576,
                gb: 1073741824, gigabyte: 1073741824, gigabytes: 1073741824,
                tb: 1099511627776, terabyte: 1099511627776, terabytes: 1099511627776,
            }
        };

        // Temperature is special
        if (["c", "f", "k", "celsius", "fahrenheit", "kelvin"].includes(from) ||
            ["c", "f", "k", "celsius", "fahrenheit", "kelvin"].includes(to)) {
            const fromNorm = from.charAt(0);
            const toNorm = to.charAt(0);

            // Convert to Celsius first
            let celsius: number;
            if (fromNorm === "c") celsius = value;
            else if (fromNorm === "f") celsius = (value - 32) * 5 / 9;
            else if (fromNorm === "k") celsius = value - 273.15;
            else throw new Error(`Unknown temperature unit: ${from}`);

            // Convert from Celsius to target
            let result: number;
            if (toNorm === "c") result = celsius;
            else if (toNorm === "f") result = celsius * 9 / 5 + 32;
            else if (toNorm === "k") result = celsius + 273.15;
            else throw new Error(`Unknown temperature unit: ${to}`);

            return {
                success: true,
                result: {
                    from: { value, unit: from },
                    to: { value: Math.round(result * 1000) / 1000, unit: to },
                    formula: getTemperatureFormula(fromNorm, toNorm)
                }
            };
        }

        // Find the conversion category
        let category: Record<string, number> | null = null;
        for (const cat of Object.values(conversions)) {
            if (cat[from] !== undefined && cat[to] !== undefined) {
                category = cat;
                break;
            }
        }

        if (!category) {
            throw new Error(`Cannot convert between ${from} and ${to}`);
        }

        const fromFactor = category[from];
        const toFactor = category[to];

        if (fromFactor === undefined || toFactor === undefined) {
            throw new Error(`Cannot convert between ${from} and ${to}`);
        }

        const baseValue = value * fromFactor;
        const result = baseValue / toFactor;

        return {
            success: true,
            result: {
                from: { value, unit: from },
                to: { value: Math.round(result * 1000000) / 1000000, unit: to }
            }
        };
    } catch (error) {
        return { success: false, result: null, error: error instanceof Error ? error.message : "Conversion failed" };
    }
};

const convertTool: ToolModule = { declaration, handler };
export default convertTool;
