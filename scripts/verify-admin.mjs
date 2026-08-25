import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function readEnvValue(name) {
	if (process.env[name]) return process.env[name];

	try {
		const envFile = readFileSync('.env', 'utf8');

		for (const line of envFile.split(/\r?\n/)) {
			const trimmed = line.trim();

			if (!trimmed || trimmed.startsWith('#')) continue;

			const separator = trimmed.indexOf('=');
			if (separator === -1) continue;

			const key = trimmed.slice(0, separator).trim();
			if (key !== name) continue;

			let value = trimmed.slice(separator + 1).trim();

			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}

			return value;
		}
	} catch {
		// Validation below handles missing configuration.
	}

	return undefined;
}

const url = readEnvValue('PUBLIC_SUPABASE_URL');
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url) throw new Error('PUBLIC_SUPABASE_URL is not available.');
if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is not available.');

const supabase = createClient(url, secretKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

const email = 'branch@dogwoodlanddev.com';

const { data: authData, error: authError } =
	await supabase.auth.admin.listUsers({
		page: 1,
		perPage: 1000
	});

if (authError) throw authError;

const user = authData.users.find(
	(candidate) => candidate.email?.toLowerCase() === email
);

console.log(`Auth user exists: ${user ? 'YES' : 'NO'}`);

if (!user) process.exit(1);

console.log(`Email confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`);

const { data: profile, error: profileError } = await supabase
	.from('profiles')
	.select('email, full_name, role, is_active')
	.eq('id', user.id)
	.single();

if (profileError) throw profileError;

console.log(`Profile exists: YES`);
console.log(`Email: ${profile.email}`);
console.log(`Name: ${profile.full_name ?? 'Not set'}`);
console.log(`Role: ${profile.role}`);
console.log(`Active: ${profile.is_active}`);
