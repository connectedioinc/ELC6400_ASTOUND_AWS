local util = require("vuci.util")

local email = {}

local ERR_CODES = {
	EMAIL_SEND_TIMEOUT = 3
}

function email:send_email(email_user, subject, message, all_recipients, timeout)
	local nixio = require("nixio")
	local cmd = {"/usr/sbin/sendmail", "-t"}
	if email_user.secure_conn == "1" then
		table.insert(cmd, "-v")
		table.insert(cmd, "-H")
		local openssl_cmd = "exec openssl s_client -quiet -connect "..util.shellquote(email_user.smtp_ip..":"..email_user.smtp_port).." -tls1_2"
		if email_user.smtp_port ~= "465" then
			openssl_cmd = openssl_cmd .. " -starttls smtp"
		end
		table.insert(cmd, openssl_cmd)
	else
		table.insert(cmd, "-S")
		table.insert(cmd, email_user.smtp_ip..":"..email_user.smtp_port)
	end
	table.insert(cmd, "-f")
	table.insert(cmd, email_user.senderemail)
	if email_user.credentials == "1" or email_user.username and email_user.password then
		table.insert(cmd, "-au"..email_user.username)
		table.insert(cmd, "-ap"..email_user.password)
	end
	if type(all_recipients) == "table" then
		all_recipients = table.concat(all_recipients, ",")
	end

	-- call sendmail using fork, exec, pipe, dup to pass data to sendmail (same as 'echo <email_info> | sendmail ...')
	-- fork 2 childs - 'sleep <timeout>' and 'echo <email_info> | sendmail ..'
	-- this way it is possible to implement process timeout - exit after whichever process exits first
	-- if sleep exits first that means the timeout was reached
	-- if sendmail exits first that means the email was sent succesfully or error happened and error code was returned
	local fd0, fd1 = nixio.pipe()
	local sendmail_pid = nixio.fork()
	if sendmail_pid > 0 then
		-- parent
		fd0:close()
		fd1:write("subject:"..subject.."\nfrom:"..email_user.senderemail.."\nto:"..all_recipients.."\n"..message.."\n")
		fd1:close()

		local sleep_pid = nixio.fork()
		if sleep_pid > 0 then
			-- parent
			local pid_exited, status, code  = nixio.waitpid() -- wait for any child proccess to exit
			if pid_exited == sleep_pid then
				nixio.kill(sendmail_pid, 15) -- SIGTERM
				return ERR_CODES.EMAIL_SEND_TIMEOUT -- sendmail timeout err code 3
			end
			return code
		elseif sleep_pid == 0 then
			-- child2
			nixio.exec("/bin/sleep", tostring(timeout))
		else
			error("fork() error")
		end
	elseif sendmail_pid == 0 then
		-- child1
		fd1:close()

		-- redirect stdin to fd0
		nixio.dup(fd0, io.stdin)

		-- exec sendmail
		nixio.exec(unpack(cmd))
	else
		error("fork() error")
	end
end
return email