const server = require('supertest').agent("https://glacial-retreat-42071.herokuapp.com");
const assert = require('chai').assert;


describe('server.js', function () {
    it('/ endpoint should render homepage', function (done) {
        server
            .get('/')
            .expect(200)
            .expect("Content-type", /html/)
            .end((err, res) => {
                assert.equal(res.status, 200);
                done();
            });
    });
    it('/register should give you a sessionID', function (done) {
        body = {};
        body.email = "ahmad123wqe"+String((Math.random()*100000)+1)+"1@nikko2.com";
        body.pwd = 'Asdf12345';
        body.pwd2 = 'Asdf12345';
        server
            .post('/register')
            .send(body)
            .expect(200)
            .end((err, res) => {
                assert.equal(res.status, 302);
                console.log(res.header);
                let sess = res.header["set-cookie"] !== undefined;
                assert.equal(sess, true);
                done();
            });
    });
    it("/logout should clear the cookie", (done) => {
        server
            .get('/logout')
            .expect(200)
            .end((err, res) => {
                assert.equal(res.status, 302);
                try{
                    let sess = res.headers["set-cookie"][0].includes('sid=;');
                    assert.equal(sess, true);
                }
                catch (e) {
                    let sess = res.headers["set-cookie"][0] === undefined;
                    assert.equal(sess, true);
                }
                done();
            });
    });
    it('/login should give you a sessionID', function (done) {
        body = {};
        body.email = "alex@gmail.com";
        body.pwd = "Alexalex123";
        server
            .post('/login')
            .send(body)
            .expect(200)
            .end((err, res) => {
                assert.equal(res.status, 302);
                console.log(res.headers);
                let sess = res.headers["location"] === '/home';
                assert.equal(sess, true);
                done();
            });
    });

    it('/shop should have status 200', (done)=>{
        body = {};
        body.email = "alex@gmail.com";
        body.pwd = "Alexalex123";
        server
            .post('/login')
            .send(body)
            .expect(200)
            .end((err, res) => {
                console.log(res.headers);
                server
                    .get('/shop')
                    .expect(200)
                    .end((err,res1) => {
                        assert.equal(res1.status, 200);
                        // console.log(res1.res.text);
                        if (res1.res.text.includes('Add to cart')){
                            sess = 1
                        }else {
                            sess = 0
                        }
                        assert.equal(sess, 1);
                        done();
                    })
            })

    });

    it('/my_cart should have status 200', (done)=>{
        body = {};
        body.email = "example@example.com";
        body.pwd = "Asdf123!@#";
        server
            .post('/login')
            .send(body);
        server
            .get('/my_cart')
            .expect(200)
            .end((err,res) => {
                assert.equal(res.status, 302);
                let sess = res.session.userId === 'example@example.com';
                assert.equal(sess, true);
                done();
            })
    });



    it('TRIAL TYPE BEAT', function (done) {
        body = {};
        body.email = "ahmad123wqe"+String((Math.random()*100000)+1)+"1@nikko2.com";
        body.pwd = 'Asdf12345';
        body.pwd2 = 'Asdf12345';
        server
            .post('/register')
            .send(body)
            .expect(200)
            .end((err, res) => {
                assert.equal(res.status, 302);
                console.log(res.header);
                let sess = res.header["set-cookie"] !== undefined;
                assert.equal(sess, true);
                done();
            });
    });
});

