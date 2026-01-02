// 在浏览器控制台粘贴这段代码来调试

// 测试 1: 检查 FormData 是否正确创建
const formData = new FormData();
formData.append('name', 'testuser');
formData.append('file', new Blob(['test data'], { type: 'image/jpeg' }), 'test.jpg');

console.log('FormData entries:');
for (let [key, value] of formData.entries()) {
    console.log(key, value);
}

// 测试 2: 发送请求到 Node-RED
fetch('http://localhost:1880/api/v1/auth/register', {
    method: 'POST',
    body: formData,
})
    .then(r => {
        console.log('Response status:', r.status);
        return r.text();
    })
    .then(text => {
        console.log('Response body:', text);
    })
    .catch(err => {
        console.error('Error:', err);
    });
