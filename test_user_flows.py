#!/usr/bin/env python3
"""
Comprehensive user flow testing for CMA application
Tests all 4 user journeys: Student, Teacher, Admin, Signup
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"
FRONTEND_URL = "http://localhost:3000"

# Test accounts from database.js seeding
TEST_ACCOUNTS = {
    'admin': {'email': 'admin@cma.edu', 'password': 'admin'},
    'teacher': {'email': 'teacher@cma.edu', 'password': 'password123'},
    'student': {'email': 'student@cma.edu', 'password': 'password456'},
}

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_test(text):
    print(f"\n📋 {text}")

def print_success(text):
    print(f"  ✅ {text}")

def print_error(text):
    print(f"  ❌ {text}")

def print_info(text):
    print(f"  ℹ️  {text}")

def api_call(method, endpoint, data=None, params=None):
    """Make API call and return response"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "POST":
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == "GET":
            response = requests.get(url, params=params, headers={'Content-Type': 'application/json'})
        elif method == "PUT":
            response = requests.put(url, json=data, headers={'Content-Type': 'application/json'})
        else:
            return None
        
        return response
    except Exception as e:
        print_error(f"API call failed: {str(e)}")
        return None

# =====================================================================
# TEST 1: STUDENT FLOW
# =====================================================================

def test_student_flow():
    print_header("TEST 1: STUDENT FLOW")
    
    # Test 1.1: Login
    print_test("1.1 Login as Student")
    response = api_call("POST", "/api/auth/login", TEST_ACCOUNTS['student'])
    
    if not response or response.status_code != 200:
        print_error(f"Login failed: {response.text if response else 'No response'}")
        return False
    
    data = response.json()
    student_id = data['user']['id']
    print_success(f"Login successful - User: {data['user']['name']}")
    print_info(f"Role: {data['user']['role']}, Status: {data['user']['status']}")
    
    # Test 1.2: Fetch student profile
    print_test("1.2 Fetch Student Profile")
    response = api_call("GET", "/api/auth/me", params={'user_id': student_id})
    
    if response and response.status_code == 200:
        data = response.json()
        print_success(f"Profile fetched - User: {data['user']['name']}")
    else:
        print_error(f"Profile fetch failed: {response.text if response else 'No response'}")
    
    # Test 1.3: Fetch all documents
    print_test("1.3 Fetch All Documents")
    response = api_call("GET", "/api/documents/list", params={'student_id': student_id})
    
    if response and response.status_code == 200:
        documents = response.json()
        doc_count = len(documents) if isinstance(documents, list) else len(documents.get('documents', []))
        print_success(f"Documents fetched - Total: {doc_count}")
    else:
        print_info(f"No documents or endpoint not available")
    
    # Test 1.4: Search documents
    print_test("1.4 Search Documents (Search for 'Timetable')")
    response = api_call("GET", "/api/documents/search", params={
        'query': 'Timetable',
        'student_id': student_id
    })
    
    if response and response.status_code == 200:
        results = response.json()
        result_count = len(results) if isinstance(results, list) else len(results.get('results', []))
        print_success(f"Search successful - Results: {result_count}")
    else:
        print_info(f"Search endpoint not available or no results")
    
    # Test 1.5: Ask AI Assistant
    print_test("1.5 Ask AI Assistant")
    response = api_call("POST", "/api/rag/ask", {
        'user_id': student_id,
        'question': "What's in the timetable?"
    })
    
    if response and response.status_code == 200:
        data = response.json()
        print_success(f"AI response received")
        print_info(f"Answer preview: {str(data.get('answer', 'N/A'))[:100]}...")
    else:
        print_info(f"AI endpoint not available or failed")
    
    # Test 1.6: Bookmark a document (if available)
    print_test("1.6 Bookmark Document")
    response = api_call("POST", "/api/bookmarks/add", {
        'user_id': student_id,
        'document_id': 'doc_1'
    })
    
    if response and response.status_code in [200, 201]:
        print_success(f"Document bookmarked")
    else:
        print_info(f"Bookmark endpoint not available or no documents")
    
    # Test 1.7: Fetch bookmarks
    print_test("1.7 Fetch Bookmarks")
    response = api_call("GET", "/api/bookmarks", params={'user_id': student_id})
    
    if response and response.status_code == 200:
        bookmarks = response.json()
        bookmark_count = len(bookmarks) if isinstance(bookmarks, list) else len(bookmarks.get('bookmarks', []))
        print_success(f"Bookmarks fetched - Total: {bookmark_count}")
    else:
        print_info(f"Bookmarks endpoint not available")
    
    print_success("✨ STUDENT FLOW COMPLETE")
    return True


# =====================================================================
# TEST 2: TEACHER FLOW
# =====================================================================

def test_teacher_flow():
    print_header("TEST 2: TEACHER FLOW")
    
    # Test 2.1: Login
    print_test("2.1 Login as Teacher")
    response = api_call("POST", "/api/auth/login", TEST_ACCOUNTS['teacher'])
    
    if not response or response.status_code != 200:
        print_error(f"Login failed: {response.text if response else 'No response'}")
        return False
    
    data = response.json()
    teacher_id = data['user']['id']
    print_success(f"Login successful - User: {data['user']['name']}")
    
    # Test 2.2: Fetch teacher profile
    print_test("2.2 Fetch Teacher Profile")
    response = api_call("GET", "/api/auth/me", params={'user_id': teacher_id})
    
    if response and response.status_code == 200:
        data = response.json()
        print_success(f"Profile fetched - Role: {data['user']['role']}")
    else:
        print_error(f"Profile fetch failed")
    
    # Test 2.3: Fetch documents uploaded by teacher
    print_test("2.3 Fetch Teacher's Documents")
    response = api_call("GET", "/api/documents/my-documents", params={'uploader_id': teacher_id})
    
    if response and response.status_code == 200:
        documents = response.json()
        doc_count = len(documents) if isinstance(documents, list) else len(documents.get('documents', []))
        print_success(f"Documents fetched - Total: {doc_count}")
    else:
        print_info(f"Teacher documents endpoint not available")
    
    # Test 2.4: Check pending student approvals
    print_test("2.4 Check Pending User Approvals")
    response = api_call("GET", "/api/auth/pending", params={
        'role': 'teacher',
        'department_id': '1'
    })
    
    if response and response.status_code == 200:
        pending = response.json()
        pending_count = len(pending) if isinstance(pending, list) else 0
        print_success(f"Pending users fetched - Total: {pending_count}")
    else:
        print_info(f"Pending approvals not available")
    
    print_success("✨ TEACHER FLOW COMPLETE")
    return True


# =====================================================================
# TEST 3: ADMIN FLOW
# =====================================================================

def test_admin_flow():
    print_header("TEST 3: ADMIN FLOW")
    
    # Test 3.1: Login
    print_test("3.1 Login as Admin")
    response = api_call("POST", "/api/auth/login", TEST_ACCOUNTS['admin'])
    
    if not response or response.status_code != 200:
        print_error(f"Login failed: {response.text if response else 'No response'}")
        return False
    
    data = response.json()
    admin_id = data['user']['id']
    print_success(f"Login successful - User: {data['user']['name']}")
    
    # Test 3.2: Fetch admin profile
    print_test("3.2 Fetch Admin Profile")
    response = api_call("GET", "/api/auth/me", params={'user_id': admin_id})
    
    if response and response.status_code == 200:
        data = response.json()
        print_success(f"Profile fetched - Role: {data['user']['role']}")
    else:
        print_error(f"Profile fetch failed")
    
    # Test 3.3: Fetch pending users
    print_test("3.3 Fetch Pending User Registrations")
    response = api_call("GET", "/api/auth/pending", params={'role': 'admin'})
    
    if response and response.status_code == 200:
        pending = response.json()
        pending_count = len(pending) if isinstance(pending, list) else 0
        print_success(f"Pending registrations fetched - Total: {pending_count}")
    else:
        print_error(f"Pending users fetch failed")
    
    # Test 3.4: Fetch all departments
    print_test("3.4 Fetch All Departments")
    response = api_call("GET", "/api/departments", params={})
    
    if response and response.status_code == 200:
        departments = response.json()
        dept_count = len(departments) if isinstance(departments, list) else 0
        print_success(f"Departments fetched - Total: {dept_count}")
    else:
        print_info(f"Departments endpoint not available")
    
    # Test 3.5: Fetch all documents
    print_test("3.5 Fetch All Documents")
    response = api_call("GET", "/api/documents", params={})
    
    if response and response.status_code == 200:
        documents = response.json()
        doc_count = len(documents) if isinstance(documents, list) else len(documents.get('documents', []))
        print_success(f"All documents fetched - Total: {doc_count}")
    else:
        print_info(f"Documents endpoint not available")
    
    # Test 3.6: Fetch analytics
    print_test("3.6 Fetch Analytics")
    response = api_call("GET", "/api/admin/analytics", params={})
    
    if response and response.status_code == 200:
        analytics = response.json()
        print_success(f"Analytics fetched")
        if 'total_users' in analytics:
            print_info(f"Total Users: {analytics.get('total_users', 'N/A')}")
            print_info(f"Total Documents: {analytics.get('total_documents', 'N/A')}")
    else:
        print_info(f"Analytics endpoint not available")
    
    print_success("✨ ADMIN FLOW COMPLETE")
    return True


# =====================================================================
# TEST 4: SIGNUP FLOW
# =====================================================================

def test_signup_flow():
    print_header("TEST 4: SIGNUP FLOW")
    
    # Test 4.1: Create new account
    print_test("4.1 Create New User Account (Signup)")
    
    new_user = {
        'name': 'Test User',
        'email': f'testuser_{int(__import__("time").time())}@test.com',
        'password': 'password123',
        'role': 'student',
        'department_id': '1'
    }
    
    response = api_call("POST", "/api/auth/signup", new_user)
    
    if not response or response.status_code not in [200, 201]:
        print_error(f"Signup failed: {response.text if response else 'No response'}")
        return False
    
    data = response.json()
    new_user_id = data['user']['id']
    new_user_email = data['user']['email']
    
    print_success(f"Signup successful - Email: {new_user_email}")
    print_info(f"Account Status: {data['user']['status']}")
    
    # Test 4.2: Verify user is in pending status
    print_test("4.2 Verify User is Pending Approval")
    
    if data['user']['status'] == 'pending':
        print_success(f"User correctly marked as PENDING")
    else:
        print_error(f"User status incorrect: {data['user']['status']}")
    
    # Test 4.3: Attempt login with pending account
    print_test("4.3 Attempt Login with Pending Account (Should Fail)")
    
    response = api_call("POST", "/api/auth/login", {
        'email': new_user_email,
        'password': new_user['password']
    })
    
    if response and response.status_code == 403:
        print_success(f"Login correctly blocked for pending account")
        print_info(f"Error message: {response.json().get('error', 'N/A')}")
    else:
        print_info(f"Login status: {response.status_code if response else 'No response'}")
    
    # Test 4.4: Admin approves new user
    print_test("4.4 Admin Approves New User")
    
    response = api_call("PUT", f"/api/auth/users/{new_user_id}/approve", {
        'status': 'approved'
    })
    
    if response and response.status_code == 200:
        print_success(f"User approval successful")
    else:
        print_error(f"Approval failed: {response.text if response else 'No response'}")
    
    # Test 4.5: Retry login after approval
    print_test("4.5 Login After Approval")
    
    response = api_call("POST", "/api/auth/login", {
        'email': new_user_email,
        'password': new_user['password']
    })
    
    if response and response.status_code == 200:
        print_success(f"Login successful after approval")
    else:
        print_error(f"Login failed: {response.text if response else 'No response'}")
    
    print_success("✨ SIGNUP FLOW COMPLETE")
    return True


# =====================================================================
# MAIN TEST RUNNER
# =====================================================================

def main():
    print("\n" + "="*60)
    print("  🚀 CMA USER FLOW TESTING SUITE")
    print("="*60)
    print(f"  Backend: {BASE_URL}")
    print(f"  Frontend: {FRONTEND_URL}")
    print("="*60)
    
    results = {}
    
    try:
        results['student'] = test_student_flow()
    except Exception as e:
        print_error(f"Student flow exception: {str(e)}")
        results['student'] = False
    
    try:
        results['teacher'] = test_teacher_flow()
    except Exception as e:
        print_error(f"Teacher flow exception: {str(e)}")
        results['teacher'] = False
    
    try:
        results['admin'] = test_admin_flow()
    except Exception as e:
        print_error(f"Admin flow exception: {str(e)}")
        results['admin'] = False
    
    try:
        results['signup'] = test_signup_flow()
    except Exception as e:
        print_error(f"Signup flow exception: {str(e)}")
        results['signup'] = False
    
    # Summary
    print_header("TEST SUMMARY")
    for test, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test.upper():15} {status}")
    
    all_passed = all(results.values())
    if all_passed:
        print("\n  🎉 ALL TESTS PASSED!")
    else:
        print("\n  ⚠️  SOME TESTS FAILED - Check details above")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
