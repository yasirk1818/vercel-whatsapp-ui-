document.addEventListener('DOMContentLoaded', () => {
    const statusMessage = document.getElementById('status-message');
    const qrContainer = document.getElementById('qr-container');
    const qrCodeDiv = document.getElementById('qr-code');
    const senderContainer = document.getElementById('sender-container');
    const userInfo = document.getElementById('user-info');
    const senderForm = document.getElementById('sender-form');
    const responseDiv = document.getElementById('response');

    let qrcode = null;

    // Har 3 second me server se status pucho
    setInterval(checkStatus, 3000);

    async function checkStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            if (data.status === 'connected') {
                statusMessage.textContent = 'Device Connected!';
                statusMessage.style.color = 'green';
                qrContainer.style.display = 'none';
                senderContainer.style.display = 'block';
                if (data.user) {
                    userInfo.textContent = `Logged in as: ${data.user.name} (${data.user.id.split(':')[0]})`;
                }
            } else if (data.status === 'qr') {
                statusMessage.textContent = 'Please scan the QR code.';
                statusMessage.style.color = 'orange';
                senderContainer.style.display = 'none';
                qrContainer.style.display = 'block';
                
                // Agar naya QR code hai toh hi generate karo
                if (qrCodeDiv.innerHTML === '') {
                    new QRCode(qrCodeDiv, {
                        text: data.qr,
                        width: 256,
                        height: 256,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                }
            } else {
                statusMessage.textContent = 'Disconnected. Trying to connect...';
                statusMessage.style.color = 'red';
                qrContainer.style.display = 'none';
                senderContainer.style.display = 'none';
                qrCodeDiv.innerHTML = ''; // QR code saaf kar do
            }
        } catch (error) {
            statusMessage.textContent = 'Error connecting to the server.';
            console.error(error);
        }
    }

    senderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const number = document.getElementById('number').value;
        const message = document.getElementById('message').value;
        responseDiv.textContent = 'Sending...';
        responseDiv.style.color = 'blue';

        try {
            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number, message })
            });

            const data = await res.json();

            if (data.success) {
                responseDiv.textContent = 'Message sent successfully!';
                responseDiv.style.color = 'green';
                senderForm.reset();
            } else {
                responseDiv.textContent = `Error: ${data.error}`;
                responseDiv.style.color = 'red';
            }
        } catch (error) {
            responseDiv.textContent = 'An unexpected error occurred.';
            responseDiv.style.color = 'red';
        }
    });

    // Pehli baar status check karo
    checkStatus();
});
