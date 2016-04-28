/**
 * Created by 蒋也 on 2016/4/2.
 */


function Login(req, res, next) {
    if(!req.session.user){
        console.log('抱歉，您还没有注册！');
        return res.redirect('/login');
    }
    next();
}

function noLogin(req, res, next) {
    if( req.session.user){

        console.log('抱歉，您还没有登录！ ');
        return res.redirect('back');
    }
    next();
}

exports.noLogin = noLogin;
exports.Login = Login;
