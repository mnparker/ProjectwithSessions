const request = require('request');
const axios = require('axios');

var getCloudinary = async() => {
    try {
        const images = await axios.get(`https://api.cloudinary.com/v1_1/:dmip4l7ub/:search`)

    }catch (e){
        console.log(e)
    }
};

module.exports = {

};