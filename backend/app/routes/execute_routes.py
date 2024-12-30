from flask import Blueprint, request, jsonify
import subprocess

execute_bp = Blueprint('execute', __name__)

@execute_bp.route('', methods=['POST', 'OPTIONS'])
def execute_code():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    code = data.get('code', '')

    try:
        result = subprocess.run(
            ['python3', '-c', code],
            capture_output=True,
            text=True,
            timeout=5
        )
        return jsonify({
            'stdout': result.stdout,
            'stderr': result.stderr,
            'success': result.returncode == 0
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Execution timed out'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400
