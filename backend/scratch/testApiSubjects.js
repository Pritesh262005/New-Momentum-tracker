const testApi = async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher1@almts.com', password: 'Teacher@123' })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login success');

    const subjectRes = await fetch('http://localhost:5000/api/v1/teacher/subjects?year=1&semester=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const subjectData = await subjectRes.json();
    console.log('API Response:', subjectData);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

testApi();
