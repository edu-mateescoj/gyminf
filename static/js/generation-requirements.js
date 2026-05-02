(function (global) {
    const DEFAULT_LIMITS = {
        minCodeLines: 3,
        minTotalVariables: 1,
        maxCodeLines: 30,
        maxTotalVariables: 20
    };

    function normalizeCount(value) {
        const parsedValue = Number.parseInt(value, 10);
        return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
    }

    function getRequestedVarCounts(options = {}) {
        return {
            int: normalizeCount(options.var_int_count),
            float: normalizeCount(options.var_float_count),
            str: normalizeCount(options.var_str_count),
            list: normalizeCount(options.var_list_count),
            bool: normalizeCount(options.var_bool_count)
        };
    }

    function hasFunctionDefinitionSelection(options = {}) {
        return Boolean(options.func_def_simple || options.func_def_a || options.func_def_ab);
    }

    function calculateStructureRequirements(options = {}, varCounts = getRequestedVarCounts(options)) {
        let requiredLines = 0;
        let minimumVariableFloor = 0;
        let additionalVariables = 0;

        if (options.main_conditions) {
            if (options.cond_if) {
                let simpleIfLines = 2;
                if (options.cond_if_elif) simpleIfLines += 2;
                if (options.cond_if_else || options.cond_if_elif_else) simpleIfLines += 2;
                requiredLines += simpleIfLines;
            }
            if (options.cond_if_if) requiredLines += 3;
            if (options.cond_if_if_if) requiredLines += 4;

            if (options.cond_if || options.cond_if_if || options.cond_if_if_if) {
                minimumVariableFloor = Math.max(minimumVariableFloor, 1);
            }
        }

        if (options.main_loops) {
            if (options.loop_for_range || options.loop_range_ab || options.loop_range_abs) {
                requiredLines += 2;
                additionalVariables += 1;
            }
            if (options.loop_nested_for2) {
                requiredLines += 3;
                additionalVariables += 2;
            }
            if (options.loop_nested_for3) {
                requiredLines += 4;
                additionalVariables += 3;
            }
            if (options.loop_for_list) {
                requiredLines += 2;
                additionalVariables += 1;
            }
            if (options.loop_for_str) {
                requiredLines += 2;
                additionalVariables += (varCounts.str === 0 ? 2 : 1);
            }
            if (options.loop_while) {
                requiredLines += 3;
                additionalVariables += 1;
            }
            if (options.loop_while_op) {
                requiredLines += 4;
                additionalVariables += 2;
            }
        }

        if (options.main_functions && hasFunctionDefinitionSelection(options)) {
            requiredLines += 3;
            if (options.func_def_a) additionalVariables += 1;
            if (options.func_def_ab) additionalVariables += 1;
            if (options.builtin_print) requiredLines += 1;
            if (options.func_return) requiredLines += 1;
        }

        return {
            requiredLines,
            minimumVariableFloor,
            additionalVariables,
            totalStructuralVariables: minimumVariableFloor + additionalVariables
        };
    }

    function calculateGenerationMinimums(options = {}, config = {}) {
        const limits = { ...DEFAULT_LIMITS, ...config };
        const varCounts = config.varCounts || getRequestedVarCounts(options);
        const explicitVarCount = Object.values(varCounts).reduce((sum, count) => sum + count, 0);
        const structureRequirements = calculateStructureRequirements(options, varCounts);

        let minTotalLines = Math.max(limits.minCodeLines, explicitVarCount) + structureRequirements.requiredLines;
        let minTotalVariables = Math.max(limits.minTotalVariables, explicitVarCount);

        minTotalVariables = Math.max(minTotalVariables, structureRequirements.minimumVariableFloor);
        minTotalVariables += structureRequirements.additionalVariables;

        if (Number.isFinite(limits.maxCodeLines)) {
            minTotalLines = Math.min(minTotalLines, limits.maxCodeLines);
        }
        if (Number.isFinite(limits.maxTotalVariables)) {
            minTotalVariables = Math.min(minTotalVariables, limits.maxTotalVariables);
        }

        return {
            minLines: minTotalLines,
            minVariables: minTotalVariables,
            explicitVarCount,
            varCounts,
            ...structureRequirements
        };
    }

    global.GenerationRequirements = {
        DEFAULT_LIMITS,
        normalizeCount,
        getRequestedVarCounts,
        hasFunctionDefinitionSelection,
        calculateStructureRequirements,
        calculateGenerationMinimums
    };
})(window);