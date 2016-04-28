//加载依赖库
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var moment = require('moment');
var session = require('express-session');


//加载checkLogin模块
var checkLogin = require('./checkLogin.js');

//引入mongoose
var mongoose = require('mongoose');

//引入模型
var models = require('./models/models');

var User = models.User;
var Note = models.Note;

//使用mongoose连接服务
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error', console.error.bind(console,'连接数据库失败'));

//创建express实例
var app = express();

//定义EJS模板引擎和模板文件位置
//设置views文件夹为存放视图文件的目录，即存放模板文件的地方，__dirname为全局变量，存储当前正在执行的脚本所在的目录
app.set('views',path.join(__dirname,'views'));
app.set('view engine', 'ejs');//设置视图模板引擎为ejs
//app.use(flash());

//定义静态文件目录
//设置public文件夹为存放静态文件的目录
app.use(express.static(path.join(__dirname,'public')));//两个下划线

//定义数据解析器
app.use(bodyParser.json());//加载解析json的中间件
app.use(bodyParser.urlencoded({ extended: true }));//加载解析urlencoded请求体的中间件

//建立session模型
app.use(session({
    secret: '1234',
    name: 'mynote',
    //cookie: {maxAge: 1000 * 60 * 20},
    cookie: {maxAge: 1000 * 60 * 60*24*7},//设置session的保存时间为1000*60表示1分钟
    resave: false,
    saveUninitialized: true
}));

//提示
/*app.use(function(req,res,next){
    res.locals.user = req.session.user;
    var error = req.session.error;
    delete req.session.error;
    res.locals.message = '';
    if(error){
        res.locals.message = '<div class="alert alert-warning">'+ error + '</div>';
    }
    next();
});*/



//响应首页get请求
app.get('/',function(req, res)
{
    if(req.session.user)//此处必须进行条件判断，否则数据传不过去
    {
// 补写逻辑
        Note.find({author: req.session.user.username})
            .exec(function (err, allNotes) {
                if (err) {
                    console.log(err);
                    return res.redirect('/');
                }

                res.render('index',
                    {   //res.render() 渲染模版，并将其产生的页面直接返回给客户端。
                        // 它接受两个参数，第一个是模板的名称，即 views 目录下的模板文件名，扩展名 .ejs 可选。
                        // 第二个参数是传递给模板的数据对象，用于模板翻译。
                        title: '首页',
                        user: req.session.user,
                        notes: allNotes
                    })
            })
    }
    else{
        res.render('index',
            {
                title: '首页',
                user: req.session.user
            });

         }
});

//响应笔记请求
app.get('/detail/:_id',checkLogin.Login);
app.get('/detail/:_id',function(req, res){
    console.log('查看笔记！');
    Note.findOne({_id: req.params._id})
        .exec(function(err, art) {
            if(err) {
                console.log(err);
                return res.redirect('/');
            }
            if(art) {
                res.render('detail',{
                    title: '笔记详情',
                    user: req.session.user,
                    art: art,
                    moment: moment
                });
            }
        });
});

//响应注册页面get请求
app.get('/register', checkLogin.noLogin);
app.get('/register',function(req, res){
    console.log('注册！');
    res.render('register',{
        user:req.session.user,
        title:'注册',
        message: req.session.error
    });
    delete  req.session.error;
});

// post请求
app.post('/register', checkLogin.noLogin);
app.post('/register', function(req, res) {
    //req.body可以获取到表单的每项数据
     var username = req.body.username,
         password = req.body.password,
         passwordRepeat = req.body.passwordRepeat;


    //检查输入的用户名是否为空，使用trim去掉两端空格
    if (username.trim().length == 0) {
        console.log('用户名不能为空！ ');
        req.session.error="用户名不能为空！";
        return res.redirect('/register');
    }

    //检查用户名只能是字母、数字、下划线的组合，长度在3-20个字符之间
    if(!username.match(/^\w+$/)){
        console.log('用户名只能是字母、数字、下划线的组合');
        req.session.error ='用户名只能是字母、数字、下划线的组合';
        return res.redirect('/register');

    }
   if (username.trim().length < 3 && username.trim().length > 20)
      {
        console.log('用户名长度位于3-20个字符之间！ ');
          req.session.error='用户名长度位于3-20个字符之间！'
        return res.redirect('/register');

      }



    //检查输入的密码是否为空，使用trim去掉两端空格
    if(password.trim().length == 0 || passwordRepeat.trim().length == 0){
        console.log('密码不能为空！ ');
        req.session.error='密码不能为空！';
        return res.redirect('/register');

    }
    // /^([a-z][A-Z][0-9])+$/

    //检查输入的密码必须同时包含数字、小写字母、大写字母,长度不能少于6
   if(!password.match( /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]+$/ )){
        console.log('密码必须同时包含数字、小写字母、大写字母 ');
         req.session.error='密码必须同时包含数字、小写字母、大写字母 ';
          return res.redirect('/register');

    }
    if (password.trim().length < 6 )
    {
        console.log('密码长度必须小于6 ！ ');
        req.session.error='密码长度必须小于6 ！ ';
        return res.redirect('/register');

    }

    //检查两次输入的密码是否一致
    if(password != passwordRepeat){
        console.log('两次输入的密码不一致！');
        req.session.error='两次输入的密码不一致！ ';
        return res.redirect('/register');

    }

    //检查用户名是否已经存在，如果不存在，则保存该条记录
    User.findOne({username:username}, function(err, user) {
        if(err){
            console.log(err);
            return res.redirect('/register');
        }
        if(user){
            console.log('用户名已经存在');
            req.session.error='用户名已经存在 ';
            return res.redirect('/register');

        }

        //对密码进行md5加密(此两句和后面的重复是为了来定义md5和md5password)
        var md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');

        //新建user对象用于保存数据
        var newUser = new User({
            username: username,
            password: md5password
        });

        newUser.save(function(err, doc){
            if(err) {
                console.log(err);
                return res.redirect('/register');
            }
            console.log('注册成功！');
            delete  req.session.error;
            return res.redirect('/');
        });
    });
});


//登录
app.get('/login', checkLogin.noLogin);
app.get('/login',function(req, res){
    console.log('登录！');
    res.render('login',{
        user:req.session.user,//自己加的
        title:'登录',
        message:req.session.error
    });
    delete req.session.error;
});
app.post('/login', checkLogin.noLogin);
app.post('/login',function(req,res){
    var username = req.body.username,
        password = req.body.password;

    User.findOne({username:username}, function(err, user) {
        if(err) {
            console.log(err);
            return res.redirect('/login');
        }
        if(!user){
            console.log('用户不存在！ ');
            req.session.error='用户不存在！ ';
            return res.redirect('/login');

        }

        //对密码进行md5加密
        var md5 = crypto.createHash('md5'),//crypto模块提供了一种封装安全证书的方法，用来作为安全HTTPS网络和HTTP链接的一部分
            md5password = md5.update(password).digest('hex');
        if(user.password !== md5password){
            console.log('密码错误！ ');
            req.session.error="密码错误！"
            return res.redirect('/login');
            delete  req.session.error;
        }
        console.log('登录成功！');
        user.password = null;
        delete user.password;
        req.session.user =user; //使得一周免登陆
        return res.redirect('/');//登录成功后跳转到主页
    });
    delete  req.session.error;
});


//退出
app.get('/quit', checkLogin.Login);
app.get('/quit',function(req, res){
    req.session.user = null;
    console.log('退出！');
    return res.redirect('/login');
});



//发布
app.get('/post', checkLogin.Login);
app.get('/post',function(req, res){
    console.log('发布！');
    res.render('post',{
        user:req.session.user,//自己加的
        title:'发布'
    });
});

app.post('/post', checkLogin.Login);
app.post('/post',function(req, res){
    var note = new Note({
            title: req.body.title,
            author: req.session.user.username,
            tag: req.body.tag,
            content: req.body.content
});
    note.save(function(err, doc) {
        if(err) {
             console.log(err);
            return res.redirect('/post');
        }
        console.log('文章发表成功！ ');
        return res.redirect('/');
    });
});





//监听3000端口
app.listen(3000, function(req, res){
    console.log('app is running at port 3000');
});
//<% code %> JavaScript代码
//<%= code %> 会原样输出 <h1>hello</h1>，
// 而 <%- code %> 则会显示 H1 大的 hello 字符串。