from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import RedirectResponse, JSONResponse
import os
import httpx
import urllib.parse
from dotenv import load_dotenv
from app.services.auth_service import auth_service

load_dotenv()

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
OAUTH_REDIRECT_URI = os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/callback')
SESSION_COOKIE_NAME = os.getenv('SESSION_COOKIE_NAME', 'session_id')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

@router.get('/auth/google')
async def start_google_auth():
    # Reload env vars to ensure we have the latest values
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    redirect_uri = os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/callback')
    
    if not client_id:
        return JSONResponse({'error': 'Server configuration error: GOOGLE_CLIENT_ID is missing'}, status_code=500)

    # Build Google OAuth consent screen URL
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent'
    }
    url = 'https://accounts.google.com/o/oauth2/v2/auth'
    # Build query
    query = '&'.join([f"{k}={urllib.parse.quote(v)}" for k, v in params.items()])
    return RedirectResponse(f"{url}?{query}")

@router.get('/auth/callback')
async def google_callback(request: Request, response: Response):
    code = request.query_params.get('code')
    if not code:
        return JSONResponse({'error': 'Missing code'}, status_code=400)

    # Exchange code for tokens
    token_url = 'https://oauth2.googleapis.com/token'
    
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    redirect_uri = os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/callback')

    data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(token_url, data=data, headers={'Accept': 'application/json'})
        if token_resp.status_code != 200:
            return JSONResponse({'error': 'Failed to fetch token', 'details': token_resp.text}, status_code=500)
        token_data = token_resp.json()

        access_token = token_data.get('access_token')
        if not access_token:
            return JSONResponse({'error': 'No access token in response'}, status_code=500)

        # Fetch user info
        userinfo_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        user_resp = await client.get(userinfo_url, headers={'Authorization': f'Bearer {access_token}'})
        if user_resp.status_code != 200:
            return JSONResponse({'error': 'Failed to fetch user info', 'details': user_resp.text}, status_code=500)
        user_info = user_resp.json()

    # Create a local session and store user info
    session_id = auth_service.create_user_session({
        'id': user_info.get('id'),
        'name': user_info.get('name'),
        'email': user_info.get('email'),
        'picture': user_info.get('picture')
    })

    # Set cookie and redirect to frontend
    redirect = RedirectResponse(FRONTEND_URL)
    redirect.set_cookie(key=SESSION_COOKIE_NAME, value=session_id, httponly=True, secure=False, samesite='lax')
    return redirect

@router.get('/auth/me')
async def get_me(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return JSONResponse({'user': None})
    user = auth_service.get_user_by_session(session_id)
    if not user:
        return JSONResponse({'user': None})
    return JSONResponse({'user': user})

@router.post('/auth/logout')
async def logout(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    resp = JSONResponse({'ok': True})
    if session_id:
        auth_service.delete_session(session_id)
        resp.delete_cookie(SESSION_COOKIE_NAME)
    return resp
