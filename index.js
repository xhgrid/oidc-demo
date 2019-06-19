const koa = require("koa");
const koaRouter = require("koa-router");
const bodyParser = require("koa-bodyparser");
const axios = require("axios");
const jwt = require("jsonwebtoken");
let app = new koa();
let router = new koaRouter();
const clientId = "aaa";
const clientSecret = "xxx";
// Authing 控制台 redirect_uri 可以填下面这个。本示例 code 换 token，token 换用户信息都在后端完成。
router.get("/oidc/handle", async (ctx, next) => {
  let code = ctx.query.code;
  // code 换 token
  let res = await axios.post(
    "https://yourapp.authing.cn/oauth/oidc/token",
    {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: "https://yourapp.cn/oidc/handle"
    }
  );
  let { access_token, id_token } = res;
  // token 换用户信息
  let userInfo = await axios.get(
    "https://users.authing.cn/oauth/oidc/user/userinfo?access_token" +
      access_token
  );
  // 这里可以操作用户信息，比如存入数据库
  // ...
  // 把用户重定向到前端登录处理页，携带 id_token，前端需要把这里的 id_token 保存，以后访问受保护资源时要携带
  ctx.redirect("http://localhost:4000/login/handle?id_token=" + id_token);
});
router.get("/protected/resource", async (ctx, next) => {
  // 用户访问受保护资源需要携带 id_token
  let idToken = ctx.header.authorization;
  try {
    // 使用 oidc 应用的 clientSecret 进行 token 验证
    // 验证失败，jsonwebtoken 库会抛出错误，比如 token 过期，签名错误
    let decoded = jwt.verify(idToken, clientSecret);
    ctx.body = {protected: "This is protected resource."}
  } catch (err) {
    // 把用户重定向到 oidc 授权地址，进行登录
    ctx.redirect(
      `http://yourapp.authing.cn/oauth/oidc/auth?client_id=${clientId}&redirect_uri=https://yourapp.cn/oidc/handle&scope=openid%20profile%20offline_access%20phone%20email&response_type=code&state=jazzb&nonce=22121&prompt=consent`
    );
  }
});
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000, "localhost");
