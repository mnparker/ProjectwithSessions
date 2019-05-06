var check_string = (string) => {
    if (typeof string !== 'string'){
        return {error: "Please input a string"}
    }
};

module.exports = {
    check_string
};