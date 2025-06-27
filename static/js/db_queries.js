function code_is_generated() {
    /*
     * Retrieve:
     *  - username
     *  - code text
     *  - timestamp
     *  - difficulty: set to something useless first
     */

    var code = codeEditorInstance.getValue();

    fetch('/code_generation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: code
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status == 'success') {
                console.log('Success');
            } else {
                console.log('DB INSERT failed: ' + data.message);
            }
        });

}