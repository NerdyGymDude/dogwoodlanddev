import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function readEnvValue(name) {
	if (process.env[name]) {
		return process.env[name];
	}

	try {
		const envFile = readFileSync('.env', 'utf8');

		for (const line of envFile.split(/\r?\n/)) {
			const trimmed = line.trim();

			if (!trimmed || trimmed.startsWith('#')) {
				continue;
			}

			const separator = trimmed.indexOf('=');

			if (separator === -1) {
				continue;
			}

			const key = trimmed.slice(0, separator).trim();

			if (key !== name) {
				continue;
			}

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
		// Validation below provides the useful error.
	}

	return undefined;
}

const supabaseUrl = readEnvValue('PUBLIC_SUPABASE_URL');
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
	throw new Error('PUBLIC_SUPABASE_URL is not loaded.');
}

if (!secretKey) {
	throw new Error('SUPABASE_SECRET_KEY is not loaded.');
}

const email = process.argv[2]?.trim().toLowerCase();
const fullName = process.argv[3]?.trim();

if (!email || !fullName) {
	console.error('Usage: node scripts/provision-admin.mjs <email> "<full name>"');
	process.exit(1);
}

const password = process.env.DOGWOOD_INITIAL_PASSWORD ?? '';

if (password.length < 8) {
	throw new Error('Password must contain at least 8 characters.');
}

const supabase = createClient(supabaseUrl, secretKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

let user;

const {
	data: created,
	error: createError
} = await supabase.auth.admin.createUser({
	email,
	password,
	email_confirm: true,
	user_metadata: {
		full_name: fullName
	}
});

if (!createError) {
	user = created.user;
	console.log(`Created Auth user: ${email}`);
} else if (
	createError.message.toLowerCase().includes('already') ||
	createError.message.toLowerCase().includes('registered')
) {
	const { data, error: listError } = await supabase.auth.admin.listUsers({
		page: 1,
		perPage: 1000
	});

	if (listError) {
		throw listError;
	}

	user = data.users.find(
		(existingUser) => existingUser.email?.toLowerCase() === email
	);

	if (!user) {
		throw new Error(
			`An Auth user appears to exist for ${email}, but it could not be located.`
		);
	}

	const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
		password,
		email_confirm: true,
		user_metadata: {
			full_name: fullName
		}
	});

	if (updateError) {
		throw updateError;
	}

	console.log(`Existing Auth user found: ${email}`);
	console.log(`Updated password for existing Auth user: ${email}`);
} else {
	throw createError;
}

if (!user) {
	throw new Error('Supabase did not return an Auth user.');
}

const { error: profileError } = await supabase
	.from('profiles')
	.upsert(
		{
			id: user.id,
			email,
			full_name: fullName,
			role: 'super_user',
			is_active: true
		},
		{
			onConflict: 'id'
		}
	);

if (profileError) {
	throw profileError;
}

console.log(`Profile role: super_user`);
console.log(`Profile active: true`);
console.log(`Provisioning complete for ${email}`);
