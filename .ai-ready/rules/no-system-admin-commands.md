# No System Administration Commands Rule

Do not execute system administration commands that require root privileges or can modify system-level configurations.

## Prohibited Commands

### Network and Firewall
- `iptables` / `ip6tables` - firewall rules
- `nftables` / `nft` - firewall framework
- `ufw` - uncomplicated firewall
- `firewalld` / `firewall-cmd` - firewall daemon

### System Configuration
- `sysctl` - kernel parameters
- `modprobe` / `insmod` / `rmmod` - kernel modules
- `update-grub` / `grub-install` - bootloader configuration

### Service Management
- `systemctl` - systemd service control
- `service` - SysV service control
- `init` / `telinit` - init system
- `journalctl` with privileged options

### User and Permission Management
- `useradd` / `userdel` / `usermod` - user management
- `groupadd` / `groupdel` / `groupmod` - group management
- `passwd` - password changes for other users
- `chown` on system files
- `chmod` on system files
- `visudo` / editing `/etc/sudoers`

### Package Management (System-wide)
- `apt` / `apt-get` / `dpkg` - Debian/Ubuntu packages
- `yum` / `dnf` / `rpm` - Red Hat/Fedora packages
- `pacman` - Arch Linux packages
- `zypper` - openSUSE packages

### Disk and Mount Operations
- `mount` / `umount` - filesystem mounting
- `fdisk` / `parted` / `gdisk` - disk partitioning
- `mkfs` - filesystem creation
- `lvm` commands - logical volume management

### Other Privileged Commands
- `sudo` - privilege escalation
- `su` - switch user
- `chroot` - change root directory
- `shutdown` / `reboot` / `poweroff` - system power control

## Exceptions

If such commands are absolutely necessary for the task, inform the user and ask them to execute the command manually with appropriate privileges.
