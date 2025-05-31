const ADMIN_PASSWORD = 'mySecretPass'; // Apnar pashe iccha moto pass set koren

module.exports = app => {

    app.get('/', (req, res) => {
        res.render('index');
    });

    app.get('/white', (req, res) => {
        const code = req.query.code;
        // Validate code here if needed
        res.render('game', { color: 'white', code: code });
    });
    
    app.get('/black', (req, res) => {
        const code = req.query.code;
        console.log("Black player requesting to join game with code:", code);

        if (!code) {
            return res.redirect('/?error=invalidCode');
        }

        // Return the game page (validation happens on socket connection)
        res.render('game', { color: 'black', code: code });
    });
    
    app.get('/view', (req, res) => {
        const code = req.query.code;
        // Validate code here if needed
        res.render('game', { color: 'viewer', code: code });
    });

    app.get('/admin', (req, res) => {
        const pass = req.query.pass;
        if (pass !== ADMIN_PASSWORD) {
            return res.redirect('/?error=unauthorized');
        }

        res.render('admin');
    });
};
