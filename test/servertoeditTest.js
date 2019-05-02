const assert = require('chai').assert;
const chai = require('chai')
const chaiHttp = require('chai-http');
const server = require('../servertoedit.js');

chai.use(chaiHttp);
chai.should();

describe("Login", () => {
    describe("GET /login", ()=>{
        it("should get status 200 from login", (done) => {
            chai.request(server)
                .get('/login')
                .end((err, res)=> {
                    res.should.have.status(200);
                    done();
                })

        })
    })
});
