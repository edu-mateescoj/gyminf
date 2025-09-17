_original_print = builtins.print
_original_input = builtins.input
user_ns = {}
_final_vars = {}
_error_detail_trace = None

def custom_print(*args, **kwargs):
    s_io = io.StringIO()
    kwargs['file'] = s_io
    _original_print(*args, **kwargs)
    message = s_io.getvalue()
    js_print_handler(message)

async def custom_input(prompt=""):
    response = await js_input_handler(prompt)
    js_print_handler(str(prompt) + str(response) + '\\n', 'output')
    return response

builtins.print = custom_print
builtins.input = custom_input

async def main():
    global _error_detail_trace, user_ns

    try:
        from ast import unparse
        tree = ast.parse(student_code_to_run)
        transformed_tree = AwaitInputTransformer().visit(tree)
        ast.fix_missing_locations(transformed_tree)
        transformed_code_string = unparse(transformed_tree)
        await pyodide.code.eval_code_async(transformed_code_string, globals=user_ns)

        function_calls = extract_function_calls(student_code_to_run)
        for call_info in function_calls:
            if call_info['func_name'] in user_ns and callable(user_ns[call_info['func_name']]):
                func_name = call_info['func_name']
                if not call_info['result_var'] and hasattr(user_ns[func_name], '__code__'):
                    try:
                        result = user_ns[func_name](4)
                        result_var_name = f"{func_name}_result"
                        user_ns[result_var_name] = result
                    except:
                        pass
    except Exception as e:
        import traceback
        _error_detail_trace = traceback.format_exc()
    finally:
        builtins.print = _original_print
        builtins.input = _original_input

await main()

if _error_detail_trace is None:
    for _var_name, _val in user_ns.items():
        if _var_name.startswith('__') or isinstance(_val, (types.ModuleType, types.FunctionType, type)):
            continue
        if _var_name in ['pyodide', 'sys', 'micropip', 'json', 'types', 'ast', 'traceback',
                         'error_detail', 'current_code', 'user_python_code',
                         'cfg_instance', 'mermaid_output', 'error_message', 'output_dict',
                         'parsed_code_string', 'List', 'Dict', 'Set', 'Tuple', 'Optional',
                         '_syntax_check_result', '_error_detail_trace', 'user_ns', '_final_vars',
                         '_original_print', '_original_input', 'custom_print', 'custom_input', 's_io',
                         'js_print_handler', 'js_input_handler', 'main',
                         'turtle_setup_script', 'student_code_to_run',
                         '_var_name', '_val']:
            continue
        if isinstance(_val, (str, int, float, bool, list, dict, tuple, set)) or _val is None:
            _final_vars[_var_name] = _val
        else:
            try:
                _final_vars[_var_name] = repr(_val)
            except:
                _final_vars[_var_name] = "<valeur non sérialisable>"

json.dumps({"variables": _final_vars, "error": _error_detail_trace})