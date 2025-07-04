const log_enum = Object.freeze({
    CODE_GENERATION: 'code_generation',
    FLOWCHART_GENERATION: 'flowchart_generation',
    VERIFY_ANSWERS: 'verify_answers',
    CHECK_SOLUTION: 'check_solution'
});

function codeIsGenerated(code) {
    let body = JSON.stringify({code: code});
    logFactory(log_enum.CODE_GENERATION, body);
}


function flowchartIsGenerated() {
    let code = lastLoadedCode;
    let body = JSON.stringify({code: code});
    logFactory(log_enum.FLOWCHART_GENERATION, body);
}


function logFactory(type, body) {
    let log_url = ""
    switch (type) {
        case log_enum.CODE_GENERATION:
            log_url = '/code_generation';
            break;
        case log_enum.FLOWCHART_GENERATION:
            log_url = '/flowchart_generation';
            break;
        default:
            log_url = null;
    }
    console.log(log_url);
    if (log_url != null) {
        fetch(log_url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: body
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('Success');
                } else {
                    console.log('DB INSERT failed: ' + data);
                }
            });
    }
}