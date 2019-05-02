
var check_num = function(num){
    console.log(typeof 123)
    if (typeof num !== 'number'){
        throw err ("Input is not a number")
    }else{
        return "Not hello"
    }
};

var check_string = (string) => {
    if (typeof string !== 'string'){
        return {error: "Please input a string"}
    }
};

module.exports = {
    check_num,
    check_string
};